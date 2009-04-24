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
from porcupine import exceptions
from porcupine.db.bsddb import db
from porcupine.db.basecursor import BaseCursor

class Cursor(BaseCursor):
    "BerkeleyDB cursor class"
    def __init__(self, index, txn=None):
        BaseCursor.__init__(self, index, txn)
        self._cursor = self._index.db.cursor(txn, db.DB_READ_COMMITTED)
        self._is_set = False
        self._get_flag = db.DB_NEXT
        
    def set(self, v):
        BaseCursor.set(self, v)
        try:
            self._is_set = bool(self._cursor.set(self._value))
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
                db.DBInvalidArgError):
            self._cursor.close()
            raise exceptions.DBTransactionIncomplete

    def set_range(self, v1, v2):
        BaseCursor.set_range(self, v1, v2)
        try:
            self._is_set = bool(self._cursor.set_range(self._range[0]))
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
                db.DBInvalidArgError):
            self._cursor.close()
            raise exceptions.DBTransactionIncomplete

    def reverse(self):
        BaseCursor.reverse(self)
        if self._is_set:
            try:
                if self._reversed:
                    self._get_flag = db.DB_PREV
                    if self._value:
                        # equality
                        self._cursor.get(db.DB_NEXT_NODUP)
                        self._cursor.get(db.DB_PREV)
                    else:
                        # range
                        if self._range[1] != None:
                            self._cursor.set_range(self._range[1])
                            self._cursor.get(db.DB_PREV)
                        else:
                            self._cursor.get(db.DB_LAST)
                else:
                    self._get_flag = db.DB_NEXT
                    if self._value:
                        # equality
                        self._cursor.set(self._value)
                    else:
                        # range
                        self._cursor.set_range(self._range[0])
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError), e:
                self._cursor.close()
                raise exceptions.DBTransactionIncomplete

    def get_current(self, get_primary=False):
        try:
            key, prim_key, value = self._cursor.pget(db.DB_CURRENT)
        except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
                db.DBInvalidArgError):
            self._cursor.close()
            raise exceptions.DBTransactionIncomplete
        if get_primary:
            return prim_key
        else:
            return self._get_item(value)

    def __iter__(self):
        if self._is_set:
            if self._value:
                # equality
                cmp_key = self._value
                cmp_value = [0]
            else:
                # range
                if self._reversed:
                    cmp_key = self._range[0]
                    cmp_value = [1]
                else:
                    cmp_key = self._range[1]
                    if cmp_key == None:
                        cmp_value = [1]
                    else:
                        cmp_value = [-1]

            try:
                key, prim_key, value = self._cursor.pget(db.DB_CURRENT)

                while cmp(key, cmp_key) in cmp_value:
                    if self.use_primary:
                        yield prim_key
                    else:
                        item = self._get_item(value)
                        if item != None:
                            yield item
                    next = self._cursor.pget(self._get_flag)
                    if not next:
                        break
                    key, prim_key, value = next
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
                    db.DBInvalidArgError):
                self._cursor.close()
                raise exceptions.DBTransactionIncomplete

    def close(self):
        self._cursor.close()

class Join(BaseCursor):
    "Helper cursor for performing joins"
    def __init__(self, primary_db, cursor_list, txn=None):
        BaseCursor.__init__(self, None, txn)
        self._cur_list = cursor_list
        self._join = None
        self._is_set = True
        self._db = primary_db
        self._is_natural = True

        for cur in self._cur_list:
            self._is_natural = (cur._value != None) and self._is_natural
            self._is_set = cur._is_set and self._is_set
        
        if self._is_set:
            if self._is_natural:
                self._join = self._db.join([c._cursor for c in self._cur_list])

    def reverse(self):
        if self._join:
            self._join.close()
        self._reversed = not self._reversed
        [c.reverse() for c in self._cur_list]
        if not self._reversed and self._is_natural:
            self._join = self._db.join([c._cursor for c in self._cur_list])

    def __iter__(self):
        if self._is_set:
            if self._join != None:
                # natural join
                if self.use_primary:
                    get = self._join.join_item
                else:
                    get = self._join.get
                try:
                    next = get(0)
                except (db.DBLockDeadlockError, db.DBLockNotGrantedError,
                        db.DBInvalidArgError):
                    self.close()
                    raise exceptions.DBTransactionIncomplete
                while next != None:
                    if self.use_primary:
                        yield next
                    else:
                        item = self._get_item(next[1])
                        if item != None:
                            yield item
                    next = get(0)
            else:
                # not a natural join
                [setattr(c, 'use_primary', True) for c in self._cur_list]
                [setattr(c, 'fetch_all', self.fetch_all)
                 for c in self._cur_list]
                ids = [id for id in self._cur_list[0]]
                for cursor in self._cur_list[1:-1]:
                    ids = [id for id in cursor
                           if id in ids]
                    if len(ids) == 0:
                        raise StopIteration
                for id in self._cur_list[-1]:
                    if id in ids:
                        if self.use_primary:
                            yield id
                        else:
                            item = self._cur_list[-1].get_current()
                            if item:
                                yield item

    def close(self):
        [cur.close() for cur in self._cur_list]
        if self._join:
            self._join.close()
