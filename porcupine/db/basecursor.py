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
"Base database cursor class"
from porcupine import context
from porcupine.core import persist
from porcupine.db import _db
from porcupine.utils import permsresolver
from porcupine.utils.db import pack_value
from porcupine.systemObjects import Shortcut


class BaseCursor(object):
    "Base cursor class"

    def __init__(self):
        self._value = None
        self._range = None
        self._reversed = False
        self._scope = None

        # fetch_mode possible values are
        # 0: return primary key only
        # 1: return objects
        self.fetch_mode = 1
        self.enforce_permissions = True
        self.resolve_shortcuts = False

    def set_scope(self, scope):
        self._scope = scope.encode()

    def _get_item(self, s):
        item = persist.loads(s)
        if not self.enforce_permissions:
            if self.resolve_shortcuts:
                while item is not None and isinstance(item, Shortcut):
                    item = _db.get_item(item.target.value)
        else:
            # check read permissions
            access = permsresolver.get_access(item, context.user)
            if item._isDeleted or access == 0:
                item = None
            elif self.resolve_shortcuts and isinstance(item, Shortcut):
                item = item.get_target()
        return item

    def set(self, v):
        val = pack_value(v)
        self._value = val
        self._range = None

    def set_range(self, lower_bound, upper_bound):
        self._range = Range(lower_bound, upper_bound)
        self._value = None

    def reverse(self):
        self._reversed = not self._reversed

    def duplicate(self):
        raise NotImplementedError

    def reset(self):
        raise NotImplementedError

    def __iter__(self):
        raise NotImplementedError

    def close(self):
        raise NotImplementedError


class Range(object):
    """
    Range objects are used for setting cursor boundaries.
    The bounds are tuples of two elements. The first element contains the
    value while the second is a boolean indicating if the value is
    inclusive.
    """

    def __init__(self, lower_bound=None, upper_bound=None):
        self.set_lower_bound(lower_bound)
        self.set_upper_bound(upper_bound)

    def set_lower_bound(self, lower_bound):
        if lower_bound is not None:
            value, inclusive = lower_bound
            self._lower_value = pack_value(value)
            self._lower_inclusive = inclusive
        else:
            self._lower_value = None
            self._lower_inclusive = False

    def set_upper_bound(self, upper_bound):
        if upper_bound is not None:
            value, inclusive = upper_bound
            self._upper_value = pack_value(value)
            self._upper_inclusive = inclusive
        else:
            self._upper_value = None
            self._upper_inclusive = False

    def __contains__(self, string_value):
        if self._lower_value is not None:
            cmp_value = [-1]
            if self._lower_inclusive:
                cmp_value.append(0)
            cmp = (self._lower_value > string_value) - \
                  (self._lower_value < string_value)
            if cmp not in cmp_value:
                return False
        if self._upper_value is not None:
            cmp_value = [1]
            if self._upper_inclusive:
                cmp_value.append(0)
            # cmp is gone
            cmp = (self._upper_value > string_value) - \
                  (self._upper_value < string_value)
            if cmp not in cmp_value:
                return False
        return True
