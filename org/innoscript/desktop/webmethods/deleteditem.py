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
Web methods for the deleted item content class
"""
from porcupine import db
from porcupine import context
from porcupine import webmethods
from porcupine import filters
from porcupine.utils import date, xml
from porcupine.systemObjects import DeletedItem

from org.innoscript.desktop.webmethods import baseitem

@filters.etag()
@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=DeletedItem,
                   max_age=3600,
                   template='../ui.Frm_DeletedItem.quix')
def properties(self):
    "Displays the deleted item's properties form"
    sLang = context.request.get_lang()
    modified = date.Date(self.modified)
    return {
        'ICON': self.__image__,
        'NAME': xml.xml_encode(self.originalName),
        'LOC': xml.xml_encode(self.originalLocation),
        'MODIFIED': modified.format(baseitem.DATES_FORMAT, sLang),
        'MODIFIED_BY': xml.xml_encode(self.modifiedBy),
        'CONTENTCLASS': self.get_deleted_item().contentclass
    }
    
@webmethods.remotemethod(of_type=DeletedItem)
@db.transactional(auto_commit=True)
def restore(self):
    "Restores the deleted item to its orginal location"
    self.restore()
    return True

@webmethods.remotemethod(of_type=DeletedItem)
@db.transactional(auto_commit=True)
def restoreTo(self, targetid):
    "Restores the deleted item to the designated target container"
    self.restore_to(targetid)
    return True

@webmethods.remotemethod(of_type=DeletedItem)
@db.transactional(auto_commit=True)
def delete(self):
    "Removes the deleted item"
    self.delete()
    return True
