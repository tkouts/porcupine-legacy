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
Web methods for the apps' container class
"""
from porcupine import context
from porcupine import webmethods
from porcupine import filters

from org.innoscript.desktop.schema import common
from org.innoscript.desktop.webmethods import baseitem

@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=common.AppsFolder,
                   max_age=3600,
                   template='../ui.Frm_AppNew.quix')
def new(self):
    "Displays the form for creating a new application"
    oApp = common.Application()
    return {
        'CC': oApp.contentclass,
        'URI': self.id,
        'ICON': oApp.__image__,
        'SECURITY_TAB': baseitem._getSecurity(self, context.user, True)
    }
