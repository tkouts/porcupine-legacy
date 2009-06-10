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
Porcupine Berkeley DB cursor classes
"""
import copy
from threading import local

from porcupine import exceptions
from porcupine.db.bsddb import db
from porcupine.db.basecursor import BaseCursor

# thread local storage of open non-transactional cursors
# used for duplicating cursors in order not avoid
# lockers starvation
_cursors = local()

class Cursor(BaseCursor):
    "BerkeleyDB cursor class"
    def __init__(self, index, trans=None):
        BaseCursor.__init__(self, index, trans)
        if trans != None:
            self._cursor = self._index.db.cursor(trans.txn)
            trans._cursors.append(self)
        else:
            if hasattr(_cursors, index.name):
                self._cursor = getattr(_cursors, index.name).dup()
            else:
                self._cursor = self._index.db.cursor(None, db.DB_READ_COMMITTED)
                setattr(_cursors, index.name, self._cursor)
        
        self._is_set = False
        self._get_flag = db.DB_NEXT

    def duplicate(self):
        clone = copy.copy(self)
        clone._cursor = self._cursor.dup()
        clone._is_set = False
        return clone

    def reset(self):
        self._reset_position()

    def _reset_position(self):
        try:
            if self._reversed:
                if self._value != None:
                    # equality
                    self._cursor.set(self._value)
                    self._cursor.get(db.DB_NEXT_NODUP)
                    self._is_set = bool(self._cursor.get(db.DB_PREV))
                else:
                    # range
                    if self._range._upper_value != None:
                        self._is_set = False
                        if self._range._upper_inclusive:
                            self._is_set = bool(
                                self._cursor.set(self._range._upper_value))
                        if not self._is_set:
                            self._cursor.set_range(self._range._upper_value)
                            self._is_set = bool(self._cursor.get(db.DB_PREV))
                    else:
                        # move to last
                        self._is_set = bool(self._cursor.get(db.DB_LAST))
            else:
                if self._value != None:
                    # equality
                    self._is_set = bool(self._cursor.set(self._value))
                else:
                    # range
                    if self._range._lower_value != None:
                        self._is_set = False
                        if self._range._lower_inclusive:
                            self._is_set = bool(
                                self._cursor.set(self._range._lower_value))
                        if not self._is_set:
                            self._is_set = bool(
                                self._cursor.set_range(self._range._lower_value))
                    else:
                        # move to first
                        self._is_set = bool(self._cursor.get(db.DB_FIRST))
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            self._trans.abort()
            raise exceptions.DBRetryTransaction

    def set(self, v):
        BaseCursor.set(self, v)
        self._is_set = False
        self._reset_position()

    def set_range(self, v1, v2):
        BaseCursor.set_range(self, v1, v2)
        self._is_set = False
        self._reset_position()

    def reverse(self):
        BaseCursor.reverse(self)
        if self._is_set:
            if self._reversed:
                self._get_flag = db.DB_PREV
            else:
                self._get_flag = db.DB_NEXT
            self._reset_postition()

    def __iter__(self):
        if self._is_set:
            if self._value != None:
                # equality
                cmp_func = lambda x: x == self._value
            else:
                # range
                cmp_func = lambda x: x in self._range
            
            try:
                key, prim_key, value = \
                    (('',) + self._cursor.pget(db.DB_CURRENT))[-3:]
                
                while cmp_func(key):
                    if self.fetch_mode == 0:
                        yield prim_key
                    elif self.fetch_mode == 1:
                        item = self._get_item(value)
                        if item != None:
                            yield item
                    elif self.fetch_mode == 2:
                        yield (prim_key, value)
                    next = self._cursor.pget(self._get_flag)
                    if not next:
                        break
                    key, prim_key, value = (('',) + next)[-3:]
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                self._trans.abort()
                raise exceptions.DBRetryTransaction

    def _close(self):
        self._cursor.close()

    def close(self):
        if self._trans != None:
            self._trans._cursors.remove(self)
        else:
            if getattr(_cursors, self._index.name) == self._cursor:
                delattr(_cursors, self._index.name)
        try:
            self._close()
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            self._trans.abort()
            raise exceptions.DBRetryTransaction

class Join(BaseCursor):
    "Helper cursor for performing joins"
    def __init__(self, primary_db, cursor_list, trans=None):
        BaseCursor.__init__(self, None, trans)
        self._cur_list = cursor_list
        self._join = None
        self._db = primary_db
        if trans:
            trans._cursors.append(self)

    def duplicate(self):
        clone = copy.copy(self)
        clone._cur_list = [cur.duplicate() for cur in self._cur_list]
        # re-set initial cursor positions
        clone.reset()
        return clone

    def reset(self):
        [cur.reset() for cur in self._cur_list]

    def reverse(self):
        self._reversed = not self._reversed
        [c.reverse() for c in self._cur_list]

    def __iter__(self):
        is_natural = True
        is_set = True
        
        for cur in self._cur_list:
            is_natural = (cur._value != None) and is_natural
            is_set = cur._is_set and is_set

        if is_set and is_natural and not self._reversed:
            self._join = self._db.join([c._cursor for c in self._cur_list])

        if is_set:
            try:
                if self._join != None:
                    # natural join
                    if self.fetch_mode == 0:
                        get = self._join.join_item
                    else:
                        get = self._join.get
                    next = get(0)
                    while next != None:
                        if self.fetch_mode == 0:
                            yield next
                        elif self.fetch_mode == 1:
                            item = self._get_item(next[1])
                            if item != None:
                                yield item
                        elif self.fetch_mode == 2:
                            yield next
                        next = get(0)
                else:
                    # not a natural join
                    # TODO: sort cursors
                    [setattr(c, 'fetch_mode', 0)
                     for c in self._cur_list[1:]]

                    if self.fetch_mode == 0:
                        self._cur_list[0].fetch_mode = 0
                        ids = set(self._cur_list[0])
                    else:
                        self._cur_list[0].fetch_mode = 2
                        ids = None

                    for cursor in self._cur_list[1:]:
                        if ids != None:
                            ids.intersection_update(cursor)
                        else:
                            ids = set(cursor)
                        if len(ids) == 0:
                            raise StopIteration
                    
                    if self.fetch_mode == 0:
                        for id in ids:
                            yield id
                    elif self.fetch_mode == 1:
                        for id, value in self._cur_list[0]:
                            if id in ids:
                                item = self._get_item(value)
                                if item != None:
                                    yield item
                    elif self.fetch_mode == 2:
                        for id, value in self._cur_list[0]:
                            if id in ids:
                                yield (id, value)
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                self._trans.abort()
                raise exceptions.DBRetryTransaction

    def _close(self):
        self._join.close()

    def close(self):
        if self._trans:
            self._trans._cursors.remove(self)
        if self._join:
            try:
                self._close()
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                self._trans.abort()
                raise exceptions.DBRetryTransaction
        [cur.close() for cur in self._cur_list]
