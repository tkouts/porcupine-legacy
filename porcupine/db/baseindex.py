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
"Base database index class"
from porcupine.core import persist, cache
from porcupine.utils.db import pack_value

_cache = cache.Cache(20)


class BaseIndex(object):
    def __init__(self, name, unique):
        self.unique = unique
        self.name = name
        self.callback = self._get_callback()

    def _get_callback(self):

        def callback(key, value):
            item = _cache.get(value, persist.loads(value))
            index_value = None
            if item._isDeleted and not self.name == '_id':
                # do not index attributes of deleted objects
                return None
            if self.name == '_id' or \
                    (hasattr(item, self.name) and hasattr(item, '_owner')):
                # if item is composite index only the _id attribute
                # otherwise allow indexing of all
                attr = getattr(item, self.name)
                if attr.__class__.__module__ != None.__class__.__module__:
                    attr = attr.value
                if self.name == '_id':
                    index_value = pack_value(attr)
                else:
                    index_value = (pack_value(item._pid) + b'_' +
                                   pack_value(attr))
            _cache[value] = item
            return index_value

        return callback

    def close(self):
        raise NotImplementedError
