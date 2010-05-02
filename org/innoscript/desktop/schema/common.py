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
"Porcupine common objects"

from porcupine import systemObjects as system
from org.innoscript.desktop.schema import properties
from porcupine import datatypes
from porcupine.core.decorators import deprecated


class File(system.Item):
    """Simple file object

    @ivar file: The file data type
    @type file: L{RequiredFile<porcupine.datatypes.RequiredFile>}
    """
    __image__ = "desktop/images/document.gif"
    __props__ = dict({'file': datatypes.RequiredFile},
                     **system.Item.__props__)

    def get_size(self):
        "Getter for L{size} property"
        return len(self.file)
    size = property(get_size, None, None, "The file's size")


class RecycleBin(system.RecycleBin):
    """
    System Recycle Bin
    ==================
    This recycle bin class has no parent container and
    its instance is the target container of all user deletions.
    If you need a recycle bin for each user subclass the
    L{porcupine.systemObjects.RecycleBin}.
    """
    def get_parent(self):
        return None
    getParent = deprecated(get_parent)


class RootFolder(system.Container):
    """
    Root Folder
    ===========
    This is the root folder, the root container of all
    Porcupine objects.
    """
    containment = system.Container.containment + (
        'org.innoscript.desktop.schema.common.Folder',
        'org.innoscript.desktop.schema.collab.ContactsFolder')

    def get_parent(self):
        return None
    getParent = deprecated(get_parent)


class AdminTools(system.Container):
    """
    Administrative Tools Folder
    ===========================
    This folder contains the users, the policies and
    the installed applications containers.
    """
    __image__ = "desktop/images/admintools.gif"


class AppsFolder(system.Container):
    """
    Installed Applications Folder
    """
    __image__ = "desktop/images/appsfolder.gif"
    containment = system.Container.containment + (
        'org.innoscript.desktop.schema.common.Application',)


class Application(system.Item):
    """B{QuiX} Application Object

    @ivar launchUrl: The application's startup URL. This URL should point to
                     a valid QuiX definition file.
    @type launchUrl: L{RequiredString<porcupine.datatypes.RequiredString>}

    @ivar icon: The icon to appear on the desktop menus.
    @type icon: L{String<porcupine.datatypes.String>}
    """
    __image__ = "desktop/images/app.gif"
    __props__ = dict({'launchUrl': datatypes.RequiredString,
                      'icon': datatypes.String},
                     **system.Item.__props__)


class Folder(system.Container):
    """
    Common Folder
    =============
    This type of folder can contain folders and documents.
    """
    containment = system.Container.containment + (
        'org.innoscript.desktop.schema.common.Folder',
        'org.innoscript.desktop.schema.common.Document')


class PersonalFolders(system.Container):
    """
    Special container for keeping the users' personal folders
    """
    containment = system.Container.containment + (
        'org.innoscript.desktop.schema.common.PersonalFolder', )


class PersonalFolder(Folder):
    """
    Personal Folder
    ===============
    Used for storing each user's personal objects.
    """


class Category(system.Container):
    """Category

    @ivar category_objects: The objects contained in this category
    @type category_objects:
        L{CategoryObjects<org.innoscript.desktop.schema.properties.
        CategoryObjects>}
    """
    __image__ = "desktop/images/category.gif"
    __props__ = dict({'category_objects': properties.CategoryObjects},
                     **system.Container.__props__)
    containment = system.Container.containment + (
        'org.innoscript.desktop.schema.common.Category', )


class Document(File):
    """Document with categorization capabilities

    @ivar categories: The document's categories
    @type categories:
        L{Categories<org.innoscript.desktop.schema.properties.Categories>}
    """
    __props__ = dict({'categories': properties.Categories},
                     **File.__props__)
