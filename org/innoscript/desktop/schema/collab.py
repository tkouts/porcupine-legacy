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
"Porcupine collaboration objects"

from porcupine import systemObjects as system
from porcupine import datatypes

from org.innoscript.desktop.schema import properties


class ContactsFolder(system.Container):
    "Contacts Folder"
    __image__ = "desktop/images/contact_folder.gif"
    containment = ('org.innoscript.desktop.schema.collab.ContactsFolder',
                   'org.innoscript.desktop.schema.collab.Contact')


class Contact(system.Item):
    """Contact object

    @ivar company: The contact's company
    @type company: L{company<porcupine.datatypes.String>}

    @ivar email: The contact's email address
    @type email: L{email<porcupine.datatypes.String>}

    @ivar categories: The contact's categories
    @type categories:
        L{Categories<org.innoscript.desktop.schema.properties.Categories>}
    """
    __image__ = "desktop/images/contact.gif"
    __props__ = dict({'company': datatypes.String,
                      'email': datatypes.String,
                      'categories': properties.Categories},
                     **system.Item.__props__)
