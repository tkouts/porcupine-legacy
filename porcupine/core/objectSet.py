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
Porcupine Object Set
"""

class ObjectSet(object):
    """
    Porcupine Object Set
    ====================
    The Porcupine object set is a versatile type for keeping a large collection
    of objects or rows with a specified schema.
    """
    __slots__ = ('_list', 'schema')
    
    def __init__(self, data, schema=None):
        self._list = data
        self.schema = schema

    def __iter__(self):
        if len(self._list) > 0:
            if self.schema == None:
                for item in self._list:
                    yield item
            else:
                for x in self._list:
                    yield dict(zip(self.schema, x))
                
    def __nonzero__(self):
        return len(self._list)
    
    def __len__(self):
        """Returns the size of the objects set.
        Valid only for resolved object sets.
        
        @raise TypeError: if the object set is unresolved
        """
        return len(self._list)
        
    def __add__(self, objectset):
        """Implements the '+' operator.
        In order to add two object sets successfully one of the following
        conditions must be met:
            1. Both of the object sets must contain objects
            2. Object sets must have identical schema
        """
        if self.schema == objectset.schema:
            return ObjectSet(self._list + objectset._list,
                             schema = self.schema)
        else:
            raise TypeError, 'Unsupported operand (+). Object sets do not ' + \
                             'have the same schema'
        
    def __contains__(self, value):
        """Implements membership tests.
        If the object set contains objects then legal tests are:
            1. C{object_id in objectset}
            2. C{object in objectset}
        If the object set contains rows then legal tests are:
            1. C{row_tuple in objectset}
            2. C{value in objectset} if the object set contains one field
        """
        if self.schema:
            if len(self.schema) != 1:
                return value in self._list
            else:
                return value in [z[0] for z in self._list]
        else:
            if not isinstance(value, str):
                try:
                    value = value._id
                except AttributeError:
                    raise TypeError, 'Invalid argument type'
            return value in [z._id for z in self._list]

    def __getitem__(self, key):
        "Implements slicing. Useful for paging."
        if self.schema == None:
            return self._list[key] 
        else:
            if type(key) == int:
                return dict(zip(self.schema, self._list[key]))
            else:
                return [dict(zip(self.schema, x)) for x in self._list[key]]
