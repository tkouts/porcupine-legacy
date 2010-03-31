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
Porcupine Object Set
"""
from collections import Set, Hashable


class ObjectSet(Set, Hashable):
    """
    Porcupine Object Set
    ====================
    The Porcupine object set is a versatile type for keeping a large collection
    of objects or rows of named values in the form of dictionaries.
    """
    def __init__(self, iterable=[]):
        self._elements = []
        self._keys = {}
        self.schema = None

        for item in iterable:
            if isinstance(item, tuple):
                id = item
            else:
                id = item._id
            if id not in self._keys:
                self._keys[id] = True
                self._elements.append(item)

    def to_list(self):
        return self._elements

    def __hash__(self):
        return hash(tuple(self._keys.keys()))

    def __iter__(self):
        if self.schema is not None:
            for item in self._elements:
                yield dict(zip(self.schema, item))
        else:
            for item in self._elements:
                yield item

    def __contains__(self, value):
        """
        Implements membership tests.
        If the object set contains objects then legal tests are:
            1. C{object_id in objectset}
            2. C{object in objectset}
        If the object set contains rows then legal tests are:
            1. C{row_tuple in objectset}
            2. C{value in objectset} if the object set contains one field
        """
        if hasattr(value, '_id'):
            id = value._id
        else:
            id = value
        if self.schema is not None:
            if not isinstance(id, tuple):
                if isinstance(id, list):
                    id = tuple(id)
                else:
                    id = (id, )
            if 'id' not in self.schema and '_id' not in self.schema:
                return id in [x[:-1] for x in self._keys]
            else:
                return id in self._keys
        else:
            return id in self._keys

    def __len__(self):
        "Returns the size of the object set."
        return len(self._elements)

    def __nonzero__(self):
        return len(self._elements)

    def __getitem__(self, key):
        "Implements slicing. Useful for paging."
        if self.schema is None:
            return self._elements[key]
        else:
            if type(key) == int:
                return dict(zip(self.schema, self._elements[key]))
            else:
                return [dict(zip(self.schema, x)) for x in self._elements[key]]

    def __or__(self, other):
        """
        Implements the '|' operator.
        In order to unite two object sets successfully one of the following
        conditions must be met:
            1. Both of the object sets must contain objects
            2. Object sets must have identical schema
        """
        if self.schema == other.schema:
            union = Set.__or__(self, other)
            union.schema = self.schema
            return union
        else:
            raise TypeError('Unsupported operand (|). Object sets do not ' +
                            'have the same schema')

    def __and__(self, other):
        """
        Implements the '&' operator.
        In order to intersect two object sets successfully one of the following
        conditions must be met:
            1. Both of the object sets must contain objects
            2. Object sets must have identical schema
        """
        if self.schema == other.schema:
            intersection = Set.__and__(self, other)
            intersection.schema = self.schema
            return intersection
        else:
            raise TypeError('Unsupported operand (&). Object sets do not ' +
                            'have the same schema')
