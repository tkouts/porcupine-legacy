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
"Base database cursor class"
import cPickle
from threading import currentThread

from porcupine.core import persist
from porcupine.db import _db
from porcupine.utils import permsresolver
from porcupine.systemObjects import Shortcut

class BaseCursor(object):
    def __init__(self, index, txn):
        self._thread = currentThread()
        self._index = index
        self._value = None
        self._range = []
        self._reversed = False
        self._txn = txn

        self.use_primary = False
        self.fetch_all = False
        self.resolve_shortcuts = False

    def _get_item(self, s):
        item = persist.loads(s)
        if self.fetch_all:
            if self.resolve_shortcuts:
                while item != None and isinstance(item, Shortcut):
                    item = _db.get_item(item.target.value, self._txn)
        else:
            # check read permissions
            access = permsresolver.get_access(item, self._thread.context.user)
            if item._isDeleted or access == 0:
                item = None
            elif self.resolve_shortcuts and isinstance(item, Shortcut):
                item = item.get_target(self._txn)
        return item

    def set(self, v):
        val = cPickle.dumps(v, 2)
        self._value = val
        self._range = []
    
    def set_range(self, v1, v2):
        self._range = []
        
        if v1 != None:
            val1 = cPickle.dumps(v1, 2)
            self._range.append(val1)
        else:
            self._range.append(None)

        if v2 != None:
            val2 = cPickle.dumps(v2, 2)
            self._range.append(val2)
        else:
            self._range.append(None)

    def reverse(self):
        self._reversed = not self._reversed
    
    def get_current(self, get_primary=False):
        raise NotImplementedError
    
    def __iter__(self):
        raise NotImplementedError
    
    def close(self):
        raise NotImplementedError
