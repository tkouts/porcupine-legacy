#==============================================================================
#   Copyright 2005-2009, Tassos Koutsovassilis
#
#   This file is part of Porcupine.
#   Porcupine is free software; you can redistribute it and/or modify
#   it under the terms of the GNU Lesser General Public License as published by
#   the Free Software Foundation; either version 2.1 of the License, or
#   (at your option) any later version.
#   Porcupine is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU Lesser General Public License for more details.
#   You should have received a copy of the GNU Lesser General Public License
#   along with Porcupine; if not, write to the Free Software
#   Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
#==============================================================================
"""
Porcupine server Berkeley DB interface
"""
import os
import time
import glob
try:
    from bsddb3 import db
except ImportError:
    from bsddb import db
from threading import Thread

from porcupine import context
from porcupine import exceptions
from porcupine.core import persist
from porcupine.core.runtime import logger
from porcupine.config.services import services
from porcupine.config.settings import settings
# db objects
from porcupine.db.bsddb.transaction import Transaction
from porcupine.db.bsddb.index import DbIndex
from porcupine.db.bsddb.cursor import Cursor, Join
# utilities
from porcupine.utils import misc
from porcupine.utils.db import _err_unsupported_index_type, pack_value
from porcupine.utils.db.backup import BackupFile


class DB(object):
    "Berkeley DB database interface"
    # data dir
    dir = os.path.abspath(settings['store']['bdb_data_dir'])
    if dir[-1] != '/':
        dir += '/'
    # log_dir
    log_dir = os.path.abspath(settings['store'].get('bdb_log_dir', dir))
    if log_dir[-1] != '/':
        log_dir += '/'
    # environment files directory
    env_dir = os.path.abspath(settings['store'].get('env_dir',
              os.path.abspath(settings['global']['temp_folder'])))
    if env_dir[-1] != '/':
        env_dir += '/'
    # cache size
    cache_size = settings['store'].get('cache_size', None)
    # maximum concurrent transactions
    # due to snapshot isolation this should be kept high enough
    txn_max = settings['store'].get('max_tx', 1000)
    # transaction timeout
    txn_timeout = settings['store'].get('tx_timeout', None)
    # shared memory key
    shm_key = settings['store'].get('shm_key', None)
    # maintenance (deadlock detector) thread
    _maintenance_thread = None
    # checkpoint thread
    _checkpoint_thread = None
    # trickle thread
    _trickle_thread = None

    # log berkeleyDB version
    logger.info('BerkeleyDB version is %s' %
                '.'.join(str(x) for x in db.version()))

    def __init__(self, **kwargs):
        # create db environment
        additional_flags = kwargs.get('flags', 0)
        recovery_mode = kwargs.get('recover', 0)
        if recovery_mode == 2:
            additional_flags |= db.DB_RECOVER_FATAL
        elif recovery_mode == 1:
            additional_flags |= db.DB_RECOVER
            if hasattr(db, 'DB_REGISTER'):
                additional_flags |= db.DB_REGISTER

        self._env = db.DBEnv()
        # ability to override settings' dir for testing purposes
        data_dir = kwargs.get('dir', self.dir)
        self._env.set_data_dir(data_dir)
        # ability to override settings' log_dir for testing purposes
        log_dir = kwargs.get('log_dir', kwargs.get('dir', self.log_dir))
        self._env.set_lg_dir(log_dir)
        self._env.set_tx_max(self.txn_max)

        if self.txn_timeout is not None:
            if self.txn_timeout > 0:
                self._env.set_timeout(self.txn_timeout, db.DB_SET_TXN_TIMEOUT)
            else:
                self._env.set_flags(db.DB_TXN_NOWAIT, 1)

        if self.cache_size is not None:
            self._env.set_cachesize(*self.cache_size)

        if os.name != 'nt' and self.shm_key:
            self._env.set_shm_key(self.shm_key)
            additional_flags |= db.DB_SYSTEM_MEM

        # replication settings
        rep_config = settings['store'].get('rep_config', None)
        init_rep = kwargs.get('init_rep', False)

        if rep_config and init_rep:
            # in replicated environments use non-durable transactions
            self._env.set_flags(db.DB_TXN_NOSYNC, 1)
            additional_flags |= db.DB_INIT_REP

        self._env.open(self.env_dir,
                       db.DB_THREAD | db.DB_INIT_MPOOL | db.DB_INIT_LOCK |
                       db.DB_INIT_LOG | db.DB_INIT_TXN | db.DB_CREATE |
                       additional_flags)

        db_flags = db.DB_THREAD | db.DB_AUTO_COMMIT | db.DB_CREATE | \
                   db.DB_MULTIVERSION
        db_mode = 0o660

        if rep_config:
            from porcupine.db.bsddb.replication import ReplicationService

            # initialiaze replication service
            self.replication_service = \
                ReplicationService(self._env, rep_config)

            if init_rep:
                # check multiprocessing
                is_multiprocess = services['main'].is_multiprocess or \
                                  services['management'].is_multiprocess

                if is_multiprocess and int(rep_config['priority']) > 0 \
                        and db.version() < (4, 8):
                    self._env.close()
                    self.__remove_env()
                    raise exceptions.ConfigurationError(
                        'Multiprocessing master candidates ' +
                        'require BerkeleyDB 4.8 or higher')

                # start replication service
                self.replication_service.start()

                # wait for client start-up
                timeout = time.time() + 20
                while time.time() < timeout and \
                        not self.replication_service.is_master() and \
                        not self.replication_service.client_startup_done:
                    time.sleep(0.02)

                timeout = time.time() + 20
                while time.time() < timeout and \
                        not (os.path.exists(
                             os.path.join(self.dir, 'porcupine.db'))):
                    time.sleep(0.02)
        else:
            self.replication_service = None

        # open items db
        while True:
            self._itemdb = db.DB(self._env)
            self._itemdb.set_pagesize(2048)
            try:
                self._itemdb.open('porcupine.db',
                                  'items',
                                  dbtype=db.DB_BTREE,
                                  mode=db_mode,
                                  flags=db_flags)
            except db.DBLockDeadlockError:
                self._itemdb.close()
                continue
            break

        # open documents db
        while True:
            self._docdb = db.DB(self._env)
            try:
                self._docdb.open('porcupine.db',
                                 'docs',
                                 dbtype=db.DB_HASH,
                                 mode=db_mode,
                                 flags=db_flags)
            except db.DBLockDeadlockError:
                self._docdb.close()
                continue
            break

        # open indices
        self._indices = {}
        for name, unique, immutable in settings['store']['indices']:
            self._indices[name] = DbIndex(self._env, self._itemdb,
                                          name, unique, immutable, db_flags)

        self._running = True

        maintain = kwargs.get('maintain', False)
        if maintain and self._maintenance_thread is None:
            # start deadlock detector
            self._maintenance_thread = Thread(target=self.__maintain,
                                              name='DB maintenance thread')
            self._maintenance_thread.start()
            # start checkpoint thread
            self._checkpoint_thread = Thread(target=self.__checkpoint,
                                             name='DB checkpoint thread')
            self._checkpoint_thread.start()
            if hasattr(self._env, 'memp_trickle'):
                # strart memp_trickle thread
                self._trickle_thread = Thread(target=self.__trickle,
                                              name='DB memp_trickle thread')
                self._trickle_thread.start()

    def is_open(self):
        return self._running

    # item operations
    def get_item(self, oid):
        if type(oid) != bytes:
            oid = oid.encode('utf-8')
        try:
            return self._indices['_id'].db.get(oid,
                txn=context._trans and context._trans.txn)
        except UnicodeEncodeError:
            return None
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            if context._trans is not None:
                context._trans.abort()
            raise exceptions.DBRetryTransaction

    def put_item(self, item):
        try:
            self._itemdb.put(
                pack_value(item._pid) + b'_' + pack_value(item._id),
                persist.dumps(item),
                context._trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            context._trans.abort()
            raise exceptions.DBRetryTransaction
        except db.DBError as e:
            if e.args[0] == _err_unsupported_index_type:
                raise db.DBError('Unsupported indexed data type')
            else:
                raise

    def delete_item(self, item):
        try:
            self._itemdb.delete(
                pack_value(item._pid) + b'_' + pack_value(item._id),
                context._trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            context._trans.abort()
            raise exceptions.DBRetryTransaction

    # containers
    def get_children(self, container_id):
        cursor = Cursor(self._itemdb, '_pid')
        cursor.set_scope(container_id)
        cursor.set_range(None, None)
        return cursor

    def get_child_by_name(self, container_id, name):
        try:
            return self._indices['displayName'].db.get(
                pack_value(container_id) + b'_' + pack_value(name),
                txn=context._trans and context._trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            if context._trans is not None:
                context._trans.abort()
            raise exceptions.DBRetryTransaction

    # external attributes
    def get_external(self, id):
        try:
            return self._docdb.get(id.encode('ascii'),
                                   txn=context._trans and context._trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            if context._trans is not None:
                context._trans.abort()
            raise exceptions.DBRetryTransaction

    def put_external(self, id, stream):
        try:
            self._docdb.put(id.encode('ascii'), stream, context._trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            context._trans.abort()
            raise exceptions.DBRetryTransaction

    def delete_external(self, id):
        try:
            self._docdb.delete(id.encode('ascii'), context._trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            context._trans.abort()
            raise exceptions.DBRetryTransaction

    # indices
    def get_cursor_list(self, conditions):
        cur_list = []
        for index, value in conditions:
            cursor = Cursor(self._indices[index].db, self._indices[index].name)
            if isinstance(value, (list, tuple)):
                reversed = (len(value) == 3 and value[2])
                cursor.set_range(value[0], value[1])
                if reversed:
                    cursor.reverse()
            else:
                cursor.set(value)
            cur_list.append(cursor)
        return cur_list

    def query(self, conditions):
        cur_list = self.get_cursor_list(conditions)
        if len(cur_list) == 1:
            return cur_list[0]
        else:
            c_join = Join(self._itemdb, cur_list)
            return c_join

    def test_conditions(self, scope, conditions):
        cur_list = self.get_cursor_list(conditions)
        if len(cur_list) == 1:
            cursor = cur_list[0]
        else:
            cursor = Join(self._itemdb, cur_list)
        cursor.set_scope(scope)
        iterator = iter(cursor)
        try:
            result = bool(next(iterator))
        except StopIteration:
            result = False
        cursor.close()
        return result

    # transactions
    def get_transaction(self, **kwargs):
        nosync = kwargs.get('nosync', False)
        snapshot = kwargs.get('snapshot', False)
        return Transaction(self._env, nosync, snapshot)

    def __remove_env(self):
        files = glob.glob(self.env_dir + '__db.*')
        for file in files:
            try:
                os.remove(file)
            except OSError:
                pass

    # administrative
    def __remove_files(self):
        # environment files
        self.__remove_env()
        # log files
        files = glob.glob(self.log_dir + 'log.*')
        for file in files:
            os.remove(file)
        # database file
        os.remove(self.dir + 'porcupine.db')
        # index file
        os.remove(self.dir + 'porcupine.idx')

    def truncate(self):
        # older versions of bsddb do not support truncate
        if hasattr(self._itemdb, 'truncate'):
            self._itemdb.truncate()
            self._docdb.truncate()
        else:
            # close database
            self.close()
            # remove old database files
            self.__remove_files()
            # open db
            self.__init__()

    def backup(self, output_file):
        # force checkpoint
        self._env.txn_checkpoint(0, 0, db.DB_FORCE)
        logs = self._env.log_archive(db.DB_ARCH_LOG)
        backfiles = [self.dir + 'porcupine.db', self.dir + 'porcupine.idx'] + \
                    [self.log_dir + log.decode() for log in logs]
        # compact backup....
        backup = BackupFile(output_file)
        backup.add_files(backfiles)

    def restore(self, bset):
        self.__remove_files()
        backup = BackupFile(bset)
        backup.extract(self.dir, self.log_dir)

    def shrink(self):
        logs = self._env.log_archive()
        for log in logs:
            os.remove(self.log_dir + log)
        return len(logs)

    def __maintain(self):
        "deadlock detection thread"
        while self._running:
            time.sleep(0.02)
            # deadlock detection
            try:
                aborted = self._env.lock_detect(db.DB_LOCK_YOUNGEST)
                if aborted:
                    logger.critical(
                        "Deadlock: Aborted %d deadlocked transaction(s)"
                        % aborted)
            except db.DBError:
                pass

    def __trickle(self):
        "memp_trickle thread"
        while self._running:
            self._env.memp_trickle(95)
            time.sleep(8)

    def __checkpoint(self):
        "checkpoint thread"
        while self._running:
            if self.replication_service is None \
                    or self.replication_service.is_master():
                # checkpoint every 512KB written
                self._env.txn_checkpoint(512, 0)
            time.sleep(16)

            #stats = self._env.txn_stat()
            #print('txns: %d' % stats['nactive'])
            #print('max txns: %d' % stats['maxnactive'])
            #print()
            #stats = self._env.lock_stat()
            #print('Lockers: %d' % stats['nlockers'])
            #print('Max Lockers: %d' % stats['maxnlockers'])
            #print('Lockers wait: %d' % stats['lockers_wait'])
            #print()
            #print('Locks: %d' % stats['nlocks'])
            #print('Max Locks: %d' % stats['maxnlocks'])
            #print('Locks wait: %d' % stats['lock_wait'])
            #print('Locks no-wait: %d' % stats['lock_nowait'])
            #print()
            #print('Lock objects: %d' % stats['nobjects'])
            #print('Max objects: %d' % stats['maxnobjects'])
            #print('Objects wait: %d' % stats['objs_wait'])
            #print()
            #print('Requested: %d' % stats['nrequests'])
            #print('Released: %d' % stats['nreleases'])
            #print('-' * 80)

    def close(self, **kwargs):
        if self._running:
            self._running = False

            # join threads
            if self._maintenance_thread is not None:
                self._maintenance_thread.join()
            if self._checkpoint_thread is not None:
                self._checkpoint_thread.join()
            if self._trickle_thread is not None:
                self._trickle_thread.join()

            self._itemdb.close()
            self._docdb.close()
            # close indexes
            [index.close() for index in self._indices.values()]
            self._env.close()
            # clean-up environment files
            if (self._maintenance_thread is not None
                    or kwargs.get('clear_env', False)):
                self.__remove_env()
