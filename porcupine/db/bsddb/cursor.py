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
import struct

from porcupine import context
from porcupine import exceptions
from porcupine.db.bsddb import db
from porcupine.db.basecursor import BaseCursor
from porcupine.utils.db import pack_value

class Cursor(BaseCursor):
    "BerkeleyDB cursor class"
    def __init__(self, index):
        BaseCursor.__init__(self, index)
        self._get_cursor()
        if context._trans is not None:
            context._trans._cursors.append(self)
        self._get_flag = db.DB_NEXT

    def _get_cursor(self):
        if context._trans is not None:
            self._cursor = self._index.db.cursor(context._trans.txn,
                                                 db.DB_READ_COMMITTED)
        else:
            if context._cursors.has_key(self._index.name):
                self._cursor = context._cursors[self._index.name].dup()
            else:
                self._cursor = self._index.db.cursor(None, db.DB_READ_COMMITTED)
                context._cursors[self._index.name] = self._cursor
        self._closed = False

    def duplicate(self):
        clone = copy.copy(self)
        clone._get_cursor()
        return clone

    def get_size(self):
        clone = self._cursor.dup(db.DB_POSITION)
        if self._value is not None:
            # equality
            size = clone.count()
        else:
            # range cursor - approximate sizing
            # assuming even distribution of keys
            first_value = struct.unpack('>L',
                (clone.first()[0] + '\x00' * 4)[:4])[0]
            last_value = struct.unpack('>L',
                (clone.last()[0] + '\x00' * 4)[:4])[0]

            cursor_range = float(last_value - first_value)

            if self._range._lower_value is not None:
                start_value = struct.unpack('>L',
                    (self._range._lower_value + '\x00' * 4)[:4])[0]
                if start_value < first_value:
                    start_value = first_value
            else:
                start_value = first_value

            if self._range._upper_value is not None:
                end_value = struct.unpack('>L',
                    (self._range._upper_value + '\x00' * 4)[:4])[0]
                if end_value > last_value:
                    end_value = last_value
            else:
                end_value = last_value

            if cursor_range == 0:
                size = 0
            else:
                size = int(((end_value - start_value) / cursor_range) *
                           len(self._index.db))
        # close clone
        try:
            clone.close()
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            raise exceptions.DBRetryTransaction

        return size

    def _set(self):
        try:
            is_set = False
            if self._reversed:
                if self._value is not None:
                    # equality
                    self._cursor.set(self._value)
                    self._cursor.get(db.DB_NEXT_NODUP)
                    is_set = bool(self._cursor.get(db.DB_PREV))
                elif self._range is not None:
                    # range
                    if self._range._upper_value is not None:
                        if self._range._upper_inclusive:
                            is_set = bool(
                                self._cursor.set(self._range._upper_value))
                        if not is_set:
                            self._cursor.set_range(self._range._upper_value)
                            is_set = bool(self._cursor.get(db.DB_PREV))
                    else:
                        # move to last
                        is_set = bool(self._cursor.get(db.DB_LAST))
            else:
                if self._value is not None:
                    # equality
                    is_set = bool(self._cursor.set(self._value))
                elif self._range is not None:
                    # range
                    if self._range._lower_value is not None:
                        if self._range._lower_inclusive:
                            is_set = bool(
                                self._cursor.set(self._range._lower_value))
                        if not is_set:
                            is_set = bool(
                                self._cursor.set_range(self._range._lower_value))
                    else:
                        # move to first
                        is_set = bool(self._cursor.get(db.DB_FIRST))
            return is_set
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            context._trans.abort()
            raise exceptions.DBRetryTransaction

    def _eval(self, item):
        if hasattr(item, self._index.name):
            attr = getattr(item, self._index.name)
            if attr.__class__.__module__ != '__builtin__':
                attr = attr.value
            packed = pack_value(attr)
            if self._value is not None:
                return self._value == packed
            else:
                return packed in self._range
        return False

    def reverse(self):
        BaseCursor.reverse(self)
        if self._reversed:
            self._get_flag = db.DB_PREV
        else:
            self._get_flag = db.DB_NEXT

    def __iter__(self):
        if self._set():
            if self._value is not None:
                # equality
                cmp_func = lambda x: x == self._value
            else:
                # range
                cmp_func = lambda x: x in self._range

            try:
                key, value = self._cursor.get(db.DB_CURRENT)
                while cmp_func(key):
                    item = self._get_item(value)
                    if item is not None:
                        if self.fetch_mode == 0:
                            yield item._id
                        elif self.fetch_mode == 1:
                            yield item
                    next = self._cursor.get(self._get_flag)
                    if not next:
                        break
                    key, value = next
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                context._trans.abort()
                raise exceptions.DBRetryTransaction

    def _close(self):
        self._cursor.close()

    def close(self):
        if not self._closed:
            if context._trans is not None:
                context._trans._cursors.remove(self)
            elif context._cursors.get(self._index.name) == self._cursor:
                del context._cursors[self._index.name]
            self._closed = True
            try:
                self._close()
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                context._trans.abort()
                raise exceptions.DBRetryTransaction

class Join(BaseCursor):
    "Helper cursor for performing joins"
    def __init__(self, primary_db, cursor_list):
        BaseCursor.__init__(self, None)
        self._cur_list = cursor_list
        self._join = None
        self._db = primary_db
        if context._trans is not None:
            context._trans._cursors.append(self)

    def duplicate(self):
        clone = copy.copy(self)
        clone._cur_list = [cur.duplicate() for cur in self._cur_list]
        return clone

    def reverse(self):
        self._reversed = not self._reversed
        [c.reverse() for c in self._cur_list]

    def _optimize(self):
        sizes = [c.get_size() for c in self._cur_list]
        cursors = zip(sizes, self._cur_list)
        cursors.sort()
        rte_cursors = [c[1] for c in cursors[1:]]
        # close run-time evaluated cursors
        [c.close() for c in rte_cursors]
        return cursors[0][1], rte_cursors

    def __iter__(self):
        is_natural = True
        is_set = True

        is_natural = all([cur._value is not None for cur in self._cur_list])
        is_set = all([cur._set() for cur in self._cur_list])
        if is_set:
            if is_natural and not self._reversed:
                # a natural join
                self._join = self._db.join([c._cursor for c in self._cur_list])
                try:
                    next = self._join.get(0)
                    while next is not None:
                        item = self._get_item(next[1])
                        if item is not None:
                            if self.fetch_mode == 0:
                                yield item._id
                            elif self.fetch_mode == 1:
                                yield item
                        next = self._join.get(0)
                except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                    context._trans.abort()
                    raise exceptions.DBRetryTransaction
            else:
                # not a natural join
                cursor, rte_cursors = self._optimize()
                cursor.enforce_permissions = self.enforce_permissions
                cursor.fetch_mode = 1
                for item in cursor:
                    is_valid = all([c._eval(item)
                                   for c in rte_cursors])
                    if is_valid:
                        if self.fetch_mode == 0:
                            yield item._id
                        elif self.fetch_mode == 1:
                            yield item

    def _close(self):
        if self._join is not None:
            self._join.close()

    def close(self):
        [cur.close() for cur in self._cur_list]
        if context._trans:
            context._trans._cursors.remove(self)
        try:
            self._close()
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            context._trans.abort()
            raise exceptions.DBRetryTransaction
