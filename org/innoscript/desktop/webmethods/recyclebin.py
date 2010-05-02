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
Web methods for the recycle bin class
"""
from porcupine import db
from porcupine import webmethods
from porcupine import filters
from porcupine.utils import date

from org.innoscript.desktop.schema.common import RecycleBin


@filters.etag()
@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=RecycleBin,
                   max_age=3600,
                   template='../ui.RecycleList.quix')
def list(self):
    "Displays the recycle bin's window"
    return {'ID': self.id}


@webmethods.remotemethod(of_type=RecycleBin)
def getInfo(self):
    "Returns info about its children"
    lstChildren = []
    children = self.get_children()
    for child in children:
        obj = {'id': child.id,
               'image': child.__image__,
               'displayName': child.originalName,
               'origloc': child.originalLocation,
               'modified': date.Date(child.modified)}
        if hasattr(child, 'size'):
            obj['size'] = child.size
        lstChildren.append(obj)
    return {'displayName': self.displayName.value,
            'contents': lstChildren}


@webmethods.remotemethod(of_type=RecycleBin)
@db.transactional(auto_commit=True)
def empty(self):
    "Empties the bin"
    self.empty()
    return True
