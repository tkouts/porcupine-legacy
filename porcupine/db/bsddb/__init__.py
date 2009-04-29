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
    from bsddb import db
except ImportError:
    from bsddb3 import db
from threading import Thread

from porcupine import exceptions
from porcupine.core import persist
from porcupine.core.runtime import logger
from porcupine.config.settings import settings
from porcupine.db.bsddb.transaction import Transaction
from porcupine.db.bsddb.index import DbIndex
from porcupine.db.bsddb.cursor import Cursor, Join
from porcupine.utils.db.backup import BackupFile

_running = False
_env = None
_itemdb = None
_docdb = None
_indices = {}
_maintenance_thread = None
_dir = None
_log_dir = None
_checkpoint_interval = 1

def open(**kwargs):
    global _env, _itemdb, _docdb, _running, _maintenance_thread, _dir, _log_dir

    _dir = os.path.abspath(settings['store']['bdb_data_dir'])
    # add trailing '/'
    if _dir[-1] != '/':
        _dir += '/'
    
    if settings['store'].has_key('checkpoint_interval'):
        global _checkpoint_interval
        _checkpoint_interval = int(settings['store']['checkpoint_interval'])
    
    # create db environment
    additional_flags = kwargs.get('flags', 0)
    recovery_mode = kwargs.get('recover', 0)
    if recovery_mode == 2:
        additional_flags = additional_flags | db.DB_RECOVER_FATAL
    elif recovery_mode == 1:
        additional_flags = additional_flags | db.DB_RECOVER

    _env = db.DBEnv()

    _env.set_data_dir(_dir)

    if settings['store'].has_key('bdb_log_dir'):
        _log_dir = os.path.abspath(settings['store']['bdb_log_dir'])
        if _log_dir[-1] != '/':
            _log_dir += '/'
        _env.set_lg_dir(_log_dir)
    else:
        _log_dir = _dir
    
    _env.open(os.path.abspath(_dir),
              db.DB_THREAD | db.DB_INIT_MPOOL | db.DB_INIT_LOCK |
              db.DB_INIT_LOG | db.DB_INIT_TXN | db.DB_CREATE |
              additional_flags)

    dbMode = 0660
    dbFlags = db.DB_THREAD | db.DB_CREATE | db.DB_AUTO_COMMIT
    
    # open items db
    _itemdb = db.DB(_env)
    _itemdb.open(
        'porcupine.db',
        'items',
        dbtype = db.DB_HASH,
        mode = dbMode,
        flags = dbFlags
    )
    
    # open documents db
    _docdb = db.DB(_env)
    _docdb.open(
        'porcupine.db',
        'docs',
        dbtype = db.DB_HASH,
        mode = dbMode,
        flags = dbFlags
    )
    
    # open indices
    for name, unique in settings['store']['indices']:
        _indices[name] = DbIndex(_env, _itemdb, name, unique)
    
    _running = True

    maintain = kwargs.get('maintain', True)
    if maintain and _maintenance_thread == None:
        _maintenance_thread = Thread(target=__maintain,
                                     name='Berkeley DB maintenance thread')
        _maintenance_thread.start()
    
def is_open():
    return _running

# item operations
def get_item(oid, trans=None):
    try:
        if trans == None:
            flags = db.DB_READ_COMMITTED
        else:
            flags = db.DB_RMW
        return _itemdb.get(oid, txn=trans and trans.txn, flags=flags)
    except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
            db.DBInvalidArgError):
        raise exceptions.DBTransactionIncomplete

def put_item(item, trans=None):
    try:
        _itemdb.put(item._id, persist.dumps(item), trans and trans.txn)
    except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
            db.DBInvalidArgError):
        raise exceptions.DBTransactionIncomplete

def delete_item(oid, trans):
    try:
        _itemdb.delete(oid, trans and trans.txn)
    except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
            db.DBInvalidArgError):
        raise exceptions.DBTransactionIncomplete

# external attributes
def get_external(id, trans):
    try:
        return _docdb.get(id, txn=trans and trans.txn)
    except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
            db.DBInvalidArgError):
        raise exceptions.DBTransactionIncomplete

def put_external(id, stream, trans):
    try:
        _docdb.put(id, stream, trans and trans.txn)
    except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
            db.DBInvalidArgError):
        raise exceptions.DBTransactionIncomplete

def delete_external(id, trans):
    try:
        _docdb.delete(id, trans and trans.txn)
    except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
            db.DBInvalidArgError):
        raise exceptions.DBTransactionIncomplete

# indices
def get_cursor_list(conditions, trans):
    cur_list = []
    for index, value in conditions:
        cursor = Cursor(_indices[index], trans and trans.txn)
        if type(value) == tuple:
            cursor.set_range(value[0], value[1])
        else:
            cursor.set(value)
        cur_list.append(cursor)
    return cur_list

def query_index(index, value, trans):
    cursor = get_cursor_list(((index, value),), trans)[0]
    return cursor

def join(conditions, trans):
    cur_list = get_cursor_list(conditions, trans)
    c_join = Join(_itemdb, cur_list, trans and trans.txn)
    return c_join

def test_join(conditions, trans):
    cur_list = get_cursor_list(conditions, trans)
    c_join = None
    iterator = None
    try:
        c_join = Join(_itemdb, cur_list, trans)
        iterator = iter(c_join)
        try:
            result = bool(iterator.next())
        except StopIteration:
            result = False
    finally:
        if iterator != None:
            iterator.close()
        if c_join != None:
            c_join.close()
    return result

# transactions
def get_transaction(nosync):
    return Transaction(_env, nosync)

# administrative
def __removeFiles():
    # environment files
    oldFiles = glob.glob(_dir + '__db.*')
    for oldFile in oldFiles:
        os.remove(oldFile)
    # log files
    oldFiles = glob.glob(_log_dir + 'log.*')
    for oldFile in oldFiles:
        os.remove(oldFile)
    # database file
    os.remove(_dir + 'porcupine.db')
    # index file
    os.remove(_dir + 'porcupine.idx')
        
def truncate():
    # older versions of bsddb do not support truncate
    if hasattr(_itemdb, 'truncate'):
        _itemdb.truncate()
        _docdb.truncate()
    else:
        # close database
        close()
        # remove old database files
        __removeFiles()
        # open db
        open()
    
def backup(output_file):
    # force checkpoint
    _env.txn_checkpoint(0, 0, db.DB_FORCE)
    logs = _env.log_archive(db.DB_ARCH_LOG)
    logs.sort()
    backfiles = (_dir + 'porcupine.db',
                 _dir + 'porcupine.idx',
                 _log_dir + logs[-1])
    # compact backup....
    backupFile = BackupFile(output_file)
    backupFile.add_files(backfiles)
        
def restore(bset):
    __removeFiles()
    backupFile = BackupFile(bset)
    backupFile.extract(_dir, _log_dir)

def shrink():
    logs = _env.log_archive()
    for log in logs:
        os.remove(_log_dir + log)
    return len(logs)

def __maintain():
    from porcupine.db import _db
    while _running:
        time.sleep(8.0)
#        stats = _env.lock_stat()
#        print 'Locks: %d' % stats['nlocks']
#        print 'Lockers: %d' % stats['nlockers']
#        print 'Locks wait: %d' % stats['lock_wait']
#        print 'Lockers wait: %d' % stats['lockers_wait']
#        print 'Acquired - Released: %d' % (stats['nrequests'] - stats['nreleases'])
#        print '-' * 80
        # deadlock detection
        try:
            aborted = _env.lock_detect(db.DB_LOCK_RANDOM, db.DB_LOCK_CONFLICT)
            if aborted:
                _db._activeTxns -= aborted
                logger.critical("Deadlock: Aborted %d deadlocked transaction(s)"
                                % aborted)
        except db.DBError:
            pass
        # checkpoint
        _env.txn_checkpoint(0, _checkpoint_interval, 0)

def close():
    global _running
    if _running:
        _running = False
        if _maintenance_thread != None:
            _maintenance_thread.join()
        for index in _indices:
            _indices[index].close()
        _itemdb.close()
        _docdb.close()
        _env.close()
