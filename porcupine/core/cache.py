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
Porcupine server cache implementation.
Used by OQL parser to cache ASTs of most commonly used queries
It could be used as object cache also...
"""
import copy
from threading import RLock

class Cache(dict):
    def __init__(self, cache_size, readonly=False):
        self.size = cache_size
        self.readonly = readonly
        self.__accesslist = []
        self.__lock = RLock()
        
    def __getitem__(self, key):
        self.__lock.acquire()
        self.__accesslist.append(key)
        self.__accesslist.remove(key)
        if self.readonly:
            obj = copy.deepcopy(dict.__getitem__(self, key))
        else:
            obj = dict.__getitem__(self, key)
        self.__lock.release()
        return obj
        
    def __setitem__(self, key, value):
        self.__lock.acquire()
        if key in self:
            self.__accesslist.remove(key)
        else:
            if len(self) >= self.size:
                del self[self.__accesslist[0]]
        dict.__setitem__(self, key, value)
        self.__accesslist.append(key)
        self.__lock.release()
        
    def __delitem__(self, key):
        self.__lock.acquire()
        self.__accesslist.remove(key)
        dict.__delitem__(self, key)
        self.__lock.release()

