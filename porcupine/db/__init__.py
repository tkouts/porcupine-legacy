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

from porcupine import context
from porcupine import exceptions
from porcupine.utils import permsresolver
from porcupine.core import compat
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
    item = _db.get_item(oid)
    if item is not None and not item._isDeleted and \
            permsresolver.get_access(item, context.user) != 0:
        return item
getItem = deprecated(get_item)

def get_transaction():
    """
    Returns a transaction handle required for database updates.
    Currently, nested transactions are not supported.
    Subsequent calls to C{getTransaction} will return the same handle.

    @rtype: L{BaseTransaction<porcupine.db.basetransaction.BaseTransaction>}
    """
    txn = context._trans
    if txn is None:
        raise exceptions.InternalServerError(
            "Not in a transactional context. Use @db.transactional().")
    return txn
getTransaction = deprecated(get_transaction)

def requires_transactional_context(function):
    """
    Use this descriptor to ensure that a function or method is
    run in a transactional context. Required for functions/methods that perform
    database updates.
    """
    def rtc_wrapper(*args, **kwargs):
        if context._trans is None:
            raise exceptions.InternalServerError(
                "Not in a transactional context. Use @db.transactional().")
        return function(*args, **kwargs)
    compat.set_func_name(rtc_wrapper, compat.get_func_name(function))
    compat.set_func_doc(rtc_wrapper, compat.get_func_doc(function))
    rtc_wrapper.__module__ = function.__module__
    return rtc_wrapper

def transactional(auto_commit=False, nosync=False):
    _min_sleep_time = 0.072
    _max_sleep_time = 0.288
    def transactional_decorator(function):
        """
        This is the descriptor for making a function or a Web method
        transactional.
        """
        def transactional_wrapper(*args):
            # check if running in a replicated site and is master
            rep_mgr = _db.get_replication_manager()
            if rep_mgr is not None and not rep_mgr.is_master():
                # TODO: abort txn in chained calls?
                raise exceptions.DBReadOnly(
                    'Attempted write operation in read-only database.')
            
            if context._trans is None:
                txn = _db.get_transaction(nosync)
                context._trans = txn
                is_top_level = True
            else:
                txn = context._trans
                is_top_level = False
            retries = 0
            sleep_time = _min_sleep_time

            try:
                while retries < txn.txn_max_retries:
                    try:
                        if is_top_level:
                            cargs = copy.deepcopy(args, {'_dup_ext_' : False})
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
                    context._trans = None
        compat.set_func_name(transactional_wrapper, compat.get_func_name(function))
        compat.set_func_doc(transactional_wrapper, compat.get_func_doc(function))
        transactional_wrapper.__module__ = function.__module__
        return transactional_wrapper
    return transactional_decorator