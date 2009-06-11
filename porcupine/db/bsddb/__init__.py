#===============================================================================
#    Copyright 2005-2009, Tassos Koutsovassilis
#
#    This file is part of Porcupine.
#    Porcupine is free software; you can redistribute it and/or modify
#    it under the terms of the GNU Lesser General Public License as published by
#    the Free Software Foundation; either version 2.1 of the License, or
#    (at your option) any later version.
#    Porcupine is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Lesser General Public License for more details.
#    You should have received a copy of the GNU Lesser General Public License
#    along with Porcupine; if not, write to the Free Software
#    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
#===============================================================================
"""
Porcupine server Berkeley DB interface
"""
import os.path
import os
import time
import glob
try:
    from bsddb3 import db
except ImportError:
    from bsddb import db
from threading import Thread

from porcupine import exceptions
from porcupine.core import persist
from porcupine.config.settings import settings
from porcupine.db.bsddb.transaction import Transaction
from porcupine.db.bsddb.index import DbIndex
from porcupine.db.bsddb.cursor import Cursor, Join
from porcupine.utils.db import _err_unsupported_type
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
    # checkpoint interval
    checkpoint_interval = settings['store'].get('checkpoint_interval', 10)
    # cache size
    cache_size = settings['store'].get('cache_size', None)
    # maintenance (checkpoint) thread
    _maintenance_thread = None

    def __init__(self, **kwargs):
        # create db environment
        additional_flags = kwargs.get('flags', 0)
        recovery_mode = kwargs.get('recover', 0)
        if recovery_mode == 2:
            additional_flags |= db.DB_RECOVER_FATAL
        elif recovery_mode == 1:
            additional_flags |= db.DB_RECOVER
        if hasattr(db, 'DB_REGISTER'):
            additional_flags |= db.DB_RECOVER | db.DB_REGISTER

        self._env = db.DBEnv()
        self._env.set_data_dir(self.dir)
        self._env.set_lg_dir(self.log_dir)

        if self.cache_size != None:
            self._env.set_cachesize(*self.cache_size)

        self._env.open(self.dir,
                       db.DB_THREAD | db.DB_INIT_MPOOL | db.DB_INIT_LOCK |
                       db.DB_INIT_LOG | db.DB_INIT_TXN | db.DB_CREATE |
                       additional_flags)

        dbMode = 0660
        dbFlags = db.DB_THREAD | db.DB_CREATE | db.DB_AUTO_COMMIT

        # open items db
        self._itemdb = db.DB(self._env)
        self._itemdb.open(
            'porcupine.db',
            'items',
            dbtype = db.DB_HASH,
            mode = dbMode,
            flags = dbFlags
        )

        # open documents db
        self._docdb = db.DB(self._env)
        self._docdb.open(
            'porcupine.db',
            'docs',
            dbtype = db.DB_HASH,
            mode = dbMode,
            flags = dbFlags
        )

        # open indices
        self._indices = {}
        for name, unique in settings['store']['indices']:
            self._indices[name] = DbIndex(self._env, self._itemdb, name, unique)

        self._running = True

        maintain = kwargs.get('maintain', True)
        if maintain and self._maintenance_thread == None:
            self._maintenance_thread = Thread(target=self.__maintain,
                                              name='DB maintenance thread')
            self._maintenance_thread.start()
    
    def is_open(self):
        return self._running

    # item operations
    def get_item(self, oid, trans=None):
        try:
            return self._itemdb.get(oid, txn=trans and trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            trans.abort()
            raise exceptions.DBRetryTransaction

    def put_item(self, item, trans=None):
        try:
            self._itemdb.put(item._id, persist.dumps(item), trans and trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            trans.abort()
            raise exceptions.DBRetryTransaction
        except db.DBError, e:
            if e[0] == _err_unsupported_type:
                raise db.DBError, "Unsupported indexed data type"
            else:
                raise

    def delete_item(self, oid, trans):
        try:
            self._itemdb.delete(oid, trans and trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            trans.abort()
            raise exceptions.DBRetryTransaction

    # external attributes
    def get_external(self, id, trans):
        try:
            return self._docdb.get(id, txn=trans and trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            trans.abort()
            raise exceptions.DBRetryTransaction

    def put_external(self, id, stream, trans):
        try:
            self._docdb.put(id, stream, trans and trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            trans.abort()
            raise exceptions.DBRetryTransaction

    def delete_external(self, id, trans):
        try:
            self._docdb.delete(id, trans and trans.txn)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            trans.abort()
            raise exceptions.DBRetryTransaction

    # indices
    def get_cursor_list(self, conditions, trans):
        cur_list = []
        for index, value in conditions:
            cursor = Cursor(self._indices[index], trans)
            if type(value) == tuple:
                cursor.set_range(value[0], value[1])
            else:
                cursor.set(value)
            cur_list.append(cursor)
        return cur_list

    def query_index(self, index, value, trans):
        cursor = self.get_cursor_list(((index, value),), trans)[0]
        return cursor

    def join(self, conditions, trans):
        cur_list = self.get_cursor_list(conditions, trans)
        c_join = Join(self._itemdb, cur_list, trans)
        return c_join

    def switch_cursor_scope(self, cursor, scope):
        if isinstance(cursor, Join):
            # assume that the scope cursor is always last
            cursor._cur_list[-1].set(scope)
        else:
            cursor.set(scope)

    def test_join(self, conditions, trans):
        cur_list = self.get_cursor_list(conditions, trans)
        c_join = Join(self._itemdb, cur_list, trans)
        iterator = iter(c_join)
        try:
            result = bool(iterator.next())
        except StopIteration:
            result = False
        c_join.close()
        return result

    # transactions
    def get_transaction(self, nosync):
        return Transaction(self._env, nosync)

    # administrative
    def __removeFiles(self):
        # environment files
        files = glob.glob(self.dir + '__db.*')
        for file in files:
            os.remove(file)
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
            self.__removeFiles()
            # open db
            self.__init__()
    
    def backup(self, output_file):
        # force checkpoint
        self._env.txn_checkpoint(0, 0, db.DB_FORCE)
        logs = self._env.log_archive(db.DB_ARCH_LOG)
        logs.sort()
        backfiles = (self.dir + 'porcupine.db',
                     self.dir + 'porcupine.idx',
                     self.log_dir + logs[-1])
        # compact backup....
        backup = BackupFile(output_file)
        backup.add_files(backfiles)
        
    def restore(self, bset):
        self.__removeFiles()
        backup = BackupFile(bset)
        backup.extract(self.dir, self.log_dir)

    def shrink(self):
        logs = self._env.log_archive()
        for log in logs:
            os.remove(self.log_dir + log)
        return len(logs)

    def __maintain(self):
        "checkpoint thread"
        timer = 0
        while self._running:
            time.sleep(8.0)
            timer += 8
            if timer > self.checkpoint_interval * 60:
                # checkpoint
                self._env.txn_checkpoint(0, self.checkpoint_interval, 0)
                timer = 0
            #stats = self._env.txn_stat()
            #print 'txns: %d' % stats['nactive']
            #print 'max txns: %d' % stats['maxnactive']
            #print
            #stats = self._env.lock_stat()
            #print 'Lockers: %d' % stats['nlockers']
            #print 'Max Lockers: %d' % stats['maxnlockers']
            #print 'Lockers wait: %d' % stats['lockers_wait']
            #print
            #print 'Locks: %d' % stats['nlocks']
            #print 'Max Locks: %d' % stats['maxnlocks']
            #print 'Locks wait: %d' % stats['lock_wait']
            #print 'Locks no-wait: %d' % stats['lock_nowait']
            #print
            #print 'Lock objects: %d' % stats['nobjects']
            #print 'Max objects: %d' % stats['maxnobjects']
            #print 'Objects wait: %d' % stats['objs_wait']
            #print
            #print 'Requested: %d' % stats['nrequests']
            #print 'Released: %d' % stats['nreleases']
            #print '-' * 80
            # deadlock detection
            #try:
            #     aborted = self._env.lock_detect(db.DB_LOCK_RANDOM,
            #                                     db.DB_LOCK_CONFLICT)
            #     if aborted:
            #          logger.critical(
            #              "Deadlock: Aborted %d deadlocked transaction(s)"
            #             % aborted)
            #except db.DBError:
            #     pass

    def close(self):
        if self._running:
            self._running = False
            if self._maintenance_thread != None:
                self._maintenance_thread.join()
            self._itemdb.close()
            self._docdb.close()
            self._env.close()
