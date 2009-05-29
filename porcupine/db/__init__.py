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
Porcupine database package
"""
import time
import copy
from threading import currentThread

from porcupine import exceptions
from porcupine.utils import permsresolver
from porcupine.core.decorators import deprecated

def get_item(oid, trans=None):
    """
    Fetches an object from the database.
    If the user has no read permissions on the object
    or the item has been deleted then C{None} is returned.
    
    @param oid: The object's ID or the object's full path.
    @type oid: str
    
    @param trans: A valid transaction handle.
    
    @rtype: L{GenericItem<porcupine.systemObjects.GenericItem>}
    """
    item = _db.get_item(oid, trans)
    if item != None and not item._isDeleted and \
            permsresolver.get_access(item, currentThread().context.user) != 0:
        return item
getItem = deprecated(get_item)

def get_transaction():
    """
    Returns a transaction handle required for database updates.
    Currently, nested transactions are not supported.
    Subsequent calls to C{getTransaction} will return the same handle.
    
    @rtype: L{BaseTransaction<porcupine.db.basetransaction.BaseTransaction>}
    """
    txn = currentThread().context.trans
    if txn == None:
        raise exceptions.InternalServerError, \
            "Not in a transactional context. Use @db.transactional."
    return txn
getTransaction = deprecated(get_transaction)

def transactional(auto_commit=False, nosync=False):
    _min_sleep_time = 0.072
    _max_sleep_time = 0.576
    def transactional_decorator(function):
        """
        This is the descriptor for making a function or a web method
        transactional.
        """
        def transactional_wrapper(*args):
            c_thread = currentThread()
            if c_thread.context.trans == None:
                txn = _db.get_transaction(nosync)
                c_thread.context.trans = txn
                is_top_level = True
            else:
                txn = c_thread.context.trans
                is_top_level = False
            retries = 0
            sleep_time = _min_sleep_time

            try:
                while retries < txn.txn_max_retries:
                    try:
                        if is_top_level:
                            cargs = copy.deepcopy(args)
                            if retries > 0:
                                time.sleep(sleep_time)
                                sleep_time *= 2
                                if sleep_time > _max_sleep_time:
                                    sleep_time = _max_sleep_time + \
                                                 (retries * _min_sleep_time)
                                txn._retry()
                        else:
                            cargs = args
                        
                        val = function(*cargs)
                        if is_top_level and auto_commit:
                            txn.commit()
                        return val
                    except exceptions.DBRetryTransaction:
                        if is_top_level:
                            retries += 1
                        else:
                            # allow propagation
                            raise
                    except:
                        txn.abort()
                        raise
                raise exceptions.DBDeadlockError
            finally:
                if is_top_level:
                    c_thread.context.trans = None
        transactional_wrapper.func_name = function.func_name
        transactional_wrapper.func_doc = function.func_doc
        transactional_wrapper.__module__ = function.__module__
        return transactional_wrapper
    return transactional_decorator
