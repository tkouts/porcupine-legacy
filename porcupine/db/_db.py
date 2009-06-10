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
"Porcupine Server DB Interface"
import os
import time

from porcupine.core import persist
from porcupine import exceptions
from porcupine.utils import misc
from porcupine.config.settings import settings

_pids = []
_locks = 0
_activeTxns = 0
_db_handle = None
_indices = []

def open(**kwargs):
    global _db_handle, _indices
    pid = os.getpid()
    if not pid in _pids or not _db_handle.is_open():
        _db_handle = misc.get_rto_by_name(settings['store']['interface'])\
                     (**kwargs)
        _pids.append(pid)
        # update indexed attributes
        _indices = [x[0] for x in settings['store']['indices']]
        return True
    else:
        return False
    
def _get_item_by_path(lstPath, trans=None):
    child = get_item('', trans)
    for name in lstPath[1:len(lstPath)]:
        if name:
            child_id = child.get_child_id(name, trans)
            if child_id == None:
                return None
            else:
                child = get_item(child_id, trans)
    return child

def get_item(oid, trans=None):
    item = _db_handle.get_item(oid, trans)
    if item == None:
        path_tokens = oid.split('/')
        path_depth = len(path_tokens)
        if path_depth > 1:
            # /[itemID]
            if path_depth == 2:
                item = _db_handle.get_item(path_tokens[1], trans)
            # /folder1/folder2/item
            if item == None:
                return _get_item_by_path(path_tokens, trans)
    if item != None:
        item = persist.loads(item)
        return item

def put_item(item, trans=None):
    _db_handle.put_item(item, trans)
    
def delete_item(item, trans):
    _db_handle.delete_item(item._id, trans)

def get_external(id, trans):
    return _db_handle.get_external(id, trans)

def put_external(id, stream, trans):
    _db_handle.put_external(id, stream, trans)
    
def delete_external(id, trans):
    _db_handle.delete_external(id, trans)

def handle_update(item, old_item, trans):
    if item._eventHandlers:
        if old_item:
            # update
            [handler.on_update(item, old_item, trans)
             for handler in item._eventHandlers]
        else:
            # create
            [handler.on_create(item, trans)
             for handler in item._eventHandlers]
    check_unique(item, old_item, trans)
    for attr_name in item.__props__:
        try:
            attr = getattr(item, attr_name)
        except AttributeError:
            continue
        attr.validate()
        if attr._eventHandler:
            if old_item:
                # it is an update
                old_attr = getattr(old_item, attr_name)
                attr._eventHandler.on_update(item, attr, old_attr, trans)
            else:
                # it is a new object
                attr._eventHandler.on_create(item, attr, trans)

def handle_delete(item, trans, is_permanent):
    if item._eventHandlers:
        [handler.on_delete(item, trans, is_permanent) 
         for handler in item._eventHandlers]
    attrs = [getattr(item, attr_name)
             for attr_name in item.__props__
             if hasattr(item, attr_name)]
    [attr._eventHandler.on_delete(item, attr, trans, is_permanent)
     for attr in attrs
     if attr._eventHandler]

def handle_undelete(item, trans):
    check_unique(item, None, trans)
    attrs = [getattr(item, attr_name)
             for attr_name in item.__props__
             if hasattr(item, attr_name)]
    [attr._eventHandler.on_undelete(item, attr, trans)
     for attr in attrs
     if attr._eventHandler]
    
# indices
def has_index(name):
    return name in _indices

def query_index(index, value, trans=None):
    return _db_handle.query_index(index, value, trans)

def join(conditions, trans=None):
    return _db_handle.join(conditions, trans)

def switch_cursor_scope(cursor, scope):
    _db_handle.switch_cursor_scope(cursor, scope)

def test_join(conditions, trans):
    return _db_handle.test_join(conditions, trans)

def check_unique(item, old_item, trans):
    # check index uniqueness
    for index_name in [x[0] for x in settings['store']['indices'] if x[1]]:
        if hasattr(item, index_name) and hasattr(item, '_parentid'):
            value = getattr(item, index_name).value
            if old_item != None and hasattr(old_item, index_name):
                old_value = getattr(old_item, index_name).value
            else:
                old_value = None
            if value != old_value:
                join = (('_parentid', item._parentid), (index_name, value))
                if test_join(join, trans):
                    raise exceptions.ContainmentError, (
                        'The container already ' +
                        'has an item with the same "%s" value.' % index_name)

# transactions
def get_transaction(nosync=False):
    while _locks:
        time.sleep(0.2)
    return _db_handle.get_transaction(nosync)

# administrative
def lock():
    global _locks
    _locks += 1
    # allow active transactions to commit or abort...
    while _activeTxns > 0:
        time.sleep(0.2)

def unlock():
    global _locks
    if _locks:
        _locks -= 1

def backup(output_file):
    _db_handle.backup(output_file)
    
def restore(bset):
    _db_handle.restore(bset)

def truncate():
    _db_handle.truncate()

def shrink():
    return _db_handle.shrink()

def close():
    if _db_handle.is_open():
        _db_handle.close()
