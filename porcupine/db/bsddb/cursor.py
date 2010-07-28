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
Porcupine Berkeley DB cursor classes
"""
import copy

from porcupine import context
from porcupine import exceptions
from porcupine.db import _db
from porcupine.db.bsddb import db
from porcupine.db.basecursor import BaseCursor
from porcupine.utils.db import pack_value, str_long


class Cursor(BaseCursor):
    "BerkeleyDB cursor class"

    def __init__(self, db_, name):
        BaseCursor.__init__(self)
        self.db = db_
        self.name = name
        self._get_cursor()
        self._get_flag = db.DB_NEXT

    def _get_cursor(self):
        self._cursor = self.db.cursor(context._trans.txn)
        context._trans._cursors.append(self)
        self._closed = False

    def duplicate(self):
        clone = copy.copy(self)
        clone._get_cursor()
        return clone

    def _get_size(self):
        try:
            if self._value is not None:
                # equality
                size = self._cursor.count()
            else:
                # range cursor - approximate sizing
                # assuming even distribution of keys

                # get scope's range
                first_value = str_long(
                    self._cursor.set_range(self._scope + b'_')[0])
                last = self._cursor.set_range(self._scope + b'a')
                if last is not None:
                    last_value = str_long(self._cursor.get(db.DB_PREV)[0])
                else:
                    last_value = str_long(self._cursor.last()[0])
                scope_range = float(last_value - first_value)

                if self._range._lower_value is not None:
                    start_value = str_long(self._scope + b'_' +
                                           self._range._lower_value)
                    if start_value < first_value:
                        start_value = first_value
                else:
                    start_value = first_value

                if self._range._upper_value is not None:
                    end_value = str_long(self._scope + b'_' +
                                         self._range._upper_value)
                    if end_value > last_value:
                        end_value = last_value
                else:
                    end_value = last_value

                if scope_range == 0:
                    size = 0
                else:
                    children_count = _db.get_item(self._scope).children_count
                    size = int(((end_value - start_value) /
                                scope_range) * children_count)

        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            if context._trans is not None:
                context._trans.abort()
            raise exceptions.DBRetryTransaction

        return size

    def _set(self):
        is_set = False
        try:
            if self._reversed:
                if self._value is not None:
                    # equality
                    is_set = bool(self._cursor.set(self._scope + b'_' +
                                                   self._value))
                    if is_set:
                        next_nodup = self._cursor.get(db.DB_NEXT_NODUP)
                        if next_nodup is not None:
                            self._cursor.get(db.DB_PREV)
                        else:
                            self._cursor.get(db.DB_LAST)

                elif self._range is not None:
                    # range
                    if self._range._upper_value is not None:
                        first = self._cursor.set_range(
                                    self._scope + b'_' +
                                    self._range._upper_value)
                        if first is None:
                            first = self._cursor.get(db.DB_LAST)

                        if not self._range._upper_inclusive:
                            cmp_range = [1, 0]
                        else:
                            cmp_range = [1]
                        scope, key = first[0].split(b'_', 1)
                        while scope > self._scope or \
                              (scope == self._scope and
                               (key > self._range._upper_value) - \
                               (key < self._range._upper_value) in cmp_range):
                            first = self._cursor.get(db.DB_PREV_NODUP)
                            if first is None:
                                return False
                            scope, key = first[0].split(b'_', 1)
                            if scope < self._scope:
                                return False
                        is_set = bool(first)
                    else:
                        # move to last
                        next_container = self._cursor.set_range(
                                    self._scope + b'a')
                        if next_container is not None:
                            is_set = bool(self._cursor.get(db.DB_PREV))
                        else:
                            is_set = bool(self._cursor.get(db.DB_LAST))
            else:
                if self._value is not None:
                    # equality
                    is_set = bool(self._cursor.set(self._scope + b'_' +
                                                   self._value))

                elif self._range is not None:
                    # range
                    if self._range._lower_value is not None:
                        first = self._cursor.set_range(
                                    self._scope + b'_' +
                                    self._range._lower_value)
                        if first is not None \
                                and not self._range._lower_inclusive:
                            key = first[0].split(b'_', 1)[1]
                            if key == self._range._lower_value:
                                first = self._cursor.get(db.DB_NEXT_NODUP)
                        is_set = bool(first)
                    else:
                        # move to first
                        is_set = bool(
                            self._cursor.set_range(self._scope + b'_'))

        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            if context._trans is not None:
                context._trans.abort()
            raise exceptions.DBRetryTransaction

        return is_set

    def _eval(self, item):
        if hasattr(item, self.name):
            attr = getattr(item, self.name)
            if attr.__class__.__module__ != None.__class__.__module__:
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
                composite_key, value = self._cursor.get(db.DB_CURRENT)
                scope, key = composite_key.split(b'_', 1)
                while scope == self._scope and cmp_func(key):
                    item = self._get_item(value)
                    if item is not None:
                        if self.fetch_mode == 0:
                            yield item._id
                        elif self.fetch_mode == 1:
                            yield item
                    next = self._cursor.get(self._get_flag)
                    if next is None:
                        break
                    composite_key, value = next
                    scope, key = composite_key.split(b'_', 1)
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                if context._trans is not None:
                    context._trans.abort()
                raise exceptions.DBRetryTransaction

    def _close(self):
        self._cursor.close()

    def close(self):
        if not self._closed:
            context._trans._cursors.remove(self)
            self._closed = True
            try:
                self._close()
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                if context._trans is not None:
                    context._trans.abort()
                raise exceptions.DBRetryTransaction


class Join(BaseCursor):
    "Helper cursor for performing joins"

    def __init__(self, primary_db, cursor_list):
        BaseCursor.__init__(self)
        self._cur_list = cursor_list
        self._join = None
        self._db = primary_db
        #if context._trans is not None:
        context._trans._cursors.append(self)
        #else:
        #    context._cursors.append(self)

    def set_scope(self, scope):
        [c.set_scope(scope) for c in self._cur_list]
        self._scope = scope

    def duplicate(self):
        clone = copy.copy(self)
        clone._cur_list = [cur.duplicate() for cur in self._cur_list]
        return clone

    def reverse(self):
        self._reversed = not self._reversed
        [c.reverse() for c in self._cur_list]

    def _optimize(self):
        sizes = [c._get_size() for c in self._cur_list]
        cursors = list(zip(sizes, self._cur_list))
        cursors.sort()
        rte_cursors = [c[1] for c in cursors[1:]]
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
                    if context._trans is not None:
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
        context._trans._cursors.remove(self)
        try:
            self._close()
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
            if context._trans is not None:
                context._trans.abort()
            raise exceptions.DBRetryTransaction
