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
Web methods for the category content class
"""
from porcupine import webmethods
from porcupine.utils import date

from org.innoscript.desktop.schema.common import Category
from org.innoscript.desktop.webmethods.basecontainer \
    import getInfo as s_getInfo


@webmethods.remotemethod(of_type=Category)
def getInfo(self):
    "Retutns info about the category's contents"
    # call super method for getting the container's info
    info = s_getInfo(self)

    lstObjects = []
    category_objects = self.category_objects.get_items()
    for item in category_objects:
        obj = {'id': item.id,
               'image': item.__image__,
               'displayName': item.displayName.value,
               'isCollection': item.isCollection,
               'modified': date.Date(item.modified)}
        if hasattr(item, 'size'):
            obj['size'] = item.size
        lstObjects.append(obj)
    info['contents'].extend(lstObjects)

    return info
