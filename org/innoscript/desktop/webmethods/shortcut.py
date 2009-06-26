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
Web methods for the shortcut content class
"""
from porcupine import webmethods
from porcupine import context
from porcupine.systemObjects import Shortcut

@webmethods.webmethod(of_type=Shortcut)
def properties(self):
    "Displays a generic edit form based on the object's schema"
    rootUrl = context.request.get_root_url()
    context.response.redirect('%s/%s?cmd=properties' % (rootUrl,
                                                        self.target.value))
