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
"Porcupine Server DB Interface"
import os
import time

from porcupine import context
from porcupine.core import persist
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


def _get_item_by_path(lstPath):
    child = get_item('')
    for name in lstPath[1:len(lstPath)]:
        if name:
            child_id = child.get_child_id(name)
            if child_id is None:
                return None
            else:
                child = get_item(child_id)
    return child


def get_item(oid):
    item = _db_handle.get_item(oid)
    if item is None:
        path_tokens = oid.split('/')
        path_depth = len(path_tokens)
        if path_depth > 1:
            # /[itemID]
            if path_depth == 2:
                item = _db_handle.get_item(path_tokens[1])
            # /folder1/folder2/item
            if item is None:
                return _get_item_by_path(path_tokens)
    if item is not None:
        item = persist.loads(item)
        return item


def put_item(item):
    _db_handle.put_item(item)


def delete_item(item):
    _db_handle.delete_item(item)


def get_external(id):
    return _db_handle.get_external(id)


def put_external(id, stream):
    _db_handle.put_external(id, stream)


def delete_external(id):
    _db_handle.delete_external(id)


# containers
def get_children(container_id):
    return _db_handle.get_children(container_id)


def get_child_by_name(container_id, name):
    item = _db_handle.get_child_by_name(container_id, name)
    if item is not None:
        item = persist.loads(item)
    return item


# events
def handle_update(item, old_item):
    if old_item is not None:
        # check for schema modifications
        item._update_schema()
    if item._eventHandlers:
        if old_item is not None:
            # update
            [handler.on_update(item, old_item, context._trans)
             for handler in item._eventHandlers]
        else:
            # create
            [handler.on_create(item, context._trans)
             for handler in item._eventHandlers]

    for attr_name in item.__props__:
        try:
            attr = getattr(item, attr_name)
        except AttributeError:
            continue

        try:
            attr.validate()
        except (TypeError, ValueError) as e:
            # we got a validation error
            # replace attr type with attr name for a more
            # informative message
            e.args = (attr_name, ) + e.args[1:]
            raise

        if attr._eventHandler:
            if old_item:
                # it is an update
                old_attr = getattr(old_item, attr_name)
                attr._eventHandler.on_update(item, attr, old_attr)
            else:
                # it is a new object
                attr._eventHandler.on_create(item, attr)


def handle_post_update(item, old_item):
    if item._eventHandlers:
        if old_item is not None:
            # update
            [handler.on_post_update(item, old_item, context._trans)
             for handler in item._eventHandlers]
        else:
            # create
            [handler.on_post_create(item, context._trans)
             for handler in item._eventHandlers]


def handle_delete(item, is_permanent):
    if item._eventHandlers:
        [handler.on_delete(item, context._trans, is_permanent)
         for handler in item._eventHandlers]
    attrs = [getattr(item, attr_name)
             for attr_name in item.__props__
             if hasattr(item, attr_name)]
    [attr._eventHandler.on_delete(item, attr, is_permanent)
     for attr in attrs
     if attr._eventHandler]


def handle_post_delete(item, is_permanent):
    if item._eventHandlers:
        [handler.on_post_delete(item, context._trans, is_permanent)
         for handler in item._eventHandlers]


def handle_undelete(item):
    attrs = [getattr(item, attr_name)
             for attr_name in item.__props__
             if hasattr(item, attr_name)]
    [attr._eventHandler.on_undelete(item, attr)
     for attr in attrs
     if attr._eventHandler]


# indices
def has_index(name):
    return name in _indices


def query(conditions):
    return _db_handle.query(conditions)


def test_conditions(scope, conditions):
    return _db_handle.test_conditions(scope, conditions)


# transactions
def get_transaction(nosync=False):
    while _locks:
        time.sleep(0.2)
    return _db_handle.get_transaction(nosync)


# replication
def get_replication_manager():
    return _db_handle.replication_service


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


def close(**kwargs):
    if _db_handle.is_open():
        _db_handle.close(**kwargs)
