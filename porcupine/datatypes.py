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
Porcupine datatypes
===================
Base classes for custom data types.

See also the L{org.innoscript.desktop.schema.properties} module as
a usage guideline.
"""
import copy
import hashlib
import os.path
import shutil
import io

from porcupine import db
from porcupine.utils import misc, date
from porcupine.core import dteventhandlers
from porcupine.core.compat import str
from porcupine.core.objectSet import ObjectSet


class DataType(object):
    """
    Base data type class.

    Use this as a base class if you want to create your own custom datatype.

    @cvar isRequired: boolean indicating if the data type is mandatory
    @type isRequired: bool
    """
    _eventHandler = None
    isRequired = False

    def __init__(self, **kwargs):
        if isinstance(self._safetype, tuple):
            safetype = self._safetype[0]
        else:
            safetype = self._safetype
        if self._default is None and 'value' not in kwargs:
            self.value = None
        else:
            self.value = safetype(kwargs.get('value', self._default))

    def validate(self):
        """
        Data type validation method.

        This method is called automatically for each I{DataType}
        instance attribute of an object, whenever this object
        is appended or updated.

        @raise TypeError:
            if the value is not of the right type.
        @raise ValueError:
            if the data type is mandatory and is empty.

        @return: None
        """
        is_safe_type = isinstance(self.value, self._safetype)
        if not is_safe_type:
            if type(self._safetype) == tuple:
                safe_type_name = ' or '.join(['"%s"' % t.__name__
                                              for t in self._safetype])
            else:
                safe_type_name = '"%s"' % self._safetype.__name__
            raise TypeError(
                self.__class__.__name__,
               'Got "%s" instead of "%s."' %
               (self.value.__class__.__name__, safe_type_name))
        if self.isRequired and not self.value:
            raise ValueError(self.__class__.__name__, 'Attribute is mandatory')


class String(DataType):
    """String data type

    @ivar value: The datatype's value
    @type value: unicode in Python 2.6
                 str in Python 3.x
    """
    _safetype = str
    _default = ''

    def validate(self):
        if isinstance(self.value, bytes):
            self.value = self.value.decode('utf-8')
        DataType.validate(self)


class RequiredString(String):
    "Mandatory L{String} data type."
    isRequired = True


class Integer(DataType):
    """Integer data type

    @ivar value: The datatype's value
    @type value: int
    """
    _safetype = int
    _default = 0


class RequiredInteger(Integer):
    "Mandatory L{Integer} data type."
    isRequired = True


class Float(DataType):
    """Float data type

    @ivar value: The datatype's value
    @type value: float
    """
    _safetype = float
    _default = 0.0


class RequiredFloat(Float):
    "Mandatory L{Float} data type."
    isRequired = True


class Boolean(DataType):
    """Boolean data type

    @ivar value: The datatype's value
    @type value: bool
    """
    _safetype = bool
    _default = False


class List(DataType):
    """List data type

    @ivar value: The datatype's value
    @type value: list
    """
    _safetype = list
    _default = []


class RequiredList(List):
    "Mandatory L{List} data type."
    isRequired = True


class Dictionary(DataType):
    """Dictionary data type

    @ivar value: The datatype's value
    @type value: dict
    """
    _safetype = dict
    _default = {}


class RequiredDictionary(Dictionary):
    "Mandatory L{Dictionary} data type."
    isRequired = True


class Date(DataType, date.Date):
    "Date data type"
    _safetype = float

    def __init__(self, **kwargs):
        date.Date.__init__(self)


class RequiredDate(Date):
    "Mandatory L{Date} data type."
    isRequired = True


class DateTime(Date):
    "Datetime data type"


class RequiredDateTime(DateTime):
    "Mandatory L{DateTime} data type."
    isRequired = True


class Password(DataType):
    """
    Password data type.

    This data type is actually storing MD5 hex digests
    of the assigned string value.

    @ivar value: The datatype's value
    @type value: str
    """
    _safetype = bytes
    _blank = b'd41d8cd98f00b204e9800998ecf8427e'

    def __init__(self, **kwargs):
        self._value = self._blank

    def validate(self):
        if self.isRequired and self._value == self._blank:
            raise ValueError(self.__class__.__name__, 'Attribute is mandatory')
        DataType.validate(self)

    def get_value(self):
        return self._value

    def set_value(self, value):
        if value != self._value:
            if type(value) == str:
                value = value.encode('utf-8')
            self._value = hashlib.md5(value).hexdigest().encode()
    value = property(get_value, set_value)


class RequiredPassword(Password):
    "Mandatory L{Password} data type."
    isRequired = True


class Reference1(DataType):
    """
    This data type is used whenever an item losely references
    at most one other item. Using this data type, the referenced item
    B{IS NOT} aware of the items that reference it.

    @cvar relCc: a list of strings containing all the permitted content
                 classes that the instances of this type can reference.

    @ivar value: The ID of the referenced object
    @type value: str
    """
    _safetype = (str, type(None))
    _default = None
    relCc = ()

    def validate(self):
        if isinstance(self.value, bytes):
            self.value = self.value.decode('ascii')
        DataType.validate(self)

    def get_item(self):
        """
        This method returns the object that this data type
        instance references. If the current user has no read
        permission on the referenced item or it has been deleted
        then it returns None.

        @rtype: L{GenericItem<porcupine.systemObjects.GenericItem>}
        @return: The referenced object, otherwise None
        """
        item = None
        if self.value:
            item = db.get_item(self.value)
        return item


class RequiredReference1(Reference1):
    "Mandatory L{Reference1} data type."
    isRequired = True


class ReferenceN(DataType):
    """
    This data type is used whenever an item losely references
    none, one or more than one items. Using this data type,
    the referenced items B{ARE NOT} aware of the items that reference them.

    @ivar value: The IDs of the referenced objects
    @type value: list

    @cvar relCc: a list of strings containing all the permitted content
                 classes that the instances of this type can reference.
    """
    _safetype = list
    _default = []
    relCc = ()

    def get_items(self):
        """
        This method returns the items that this data type
        instance references.

        @rtype: L{ObjectSet<porcupine.core.objectSet.ObjectSet>}
        """
        items = [db.get_item(id) for id in self.value]
        return ObjectSet([item for item in items
                          if item is not None])


class RequiredReferenceN(ReferenceN):
    "Mandatory L{ReferenceN} data type."
    isRequired = True


class Relator1(Reference1):
    """
    This data type is used whenever an item possibly references another item.
    The referenced item B{IS} aware of the items that reference it.

    @cvar relAttr: contains the name of the attribute of the referenced
                   content classes. The type of the referenced attribute should
                   be B{strictly} be a subclass of L{Relator1} or L{RelatorN}
                   data types for one-to-one and one-to-many relationships
                   respectively.
    @type relAttr: str

    @cvar respectsReferences: if set to C{True} then the object cannot be
                              deleted if there are objects that reference it.
    @type respectsReferences: bool

    @cvar cascadeDelete: if set to C{True} then all the object referenced
                         will be deleted upon the object's deletion.
    @type cascadeDelete: bool
    """
    _eventHandler = dteventhandlers.Relator1EventHandler
    respectsReferences = False
    relAttr = ''
    cascadeDelete = False

    def get_item(self):
        item = None
        if self.value:
            item = db.get_item(self.value)
            if self.relAttr not in item.__props__:
                return None
        return item


class RequiredRelator1(Relator1):
    "Mandatory L{Relator1} data type."
    isRequired = True


class RelatorN(ReferenceN):
    """
    This data type is used whenever an item references none, one or more items.
    The referenced items B{ARE} aware of the items that reference them.

    @cvar relAttr: the name of the attribute of the referenced content classes.
                   The type of the referenced attribute should be B{strictly}
                   be a subclass of L{Relator1} or L{RelatorN} data types for
                   one-to-many and many-to-many relationships respectively.
    @type relAttr: str

    @cvar respectsReferences: if set to C{True} then the object
                              cannot be deleted if there are objects that
                              reference it.
    @type respectsReferences: bool

    @cvar cascadeDelete: if set to C{True} then all the objects referenced
                         will be deleted upon the object's deletion.
    @type cascadeDelete: bool
    """
    _eventHandler = dteventhandlers.RelatorNEventHandler
    relAttr = ''
    respectsReferences = False
    cascadeDelete = False

    def get_items(self):
        items = [db.get_item(id) for id in self.value]
        return ObjectSet([item for item in items
                          if item is not None and
                          self.relAttr in item.__props__])


class RequiredRelatorN(RelatorN):
    "Mandatory L{RelatorN} data type."
    isRequired = True


class Composition(DataType):
    """
    This data type is used for embedding composite objects to
    the assigned content type.

    @cvar compositeClass: the name of the content class that can be embedded.

    @ivar value: list of the embedded objects. Must be instances of
                 L{porcupine.systemObjects.Composite}.
    @type value: list

    @see: L{porcupine.systemObjects.Composite}
    """
    _safetype = list
    _default = []
    _eventHandler = dteventhandlers.CompositionEventHandler
    compositeClass = ''

    def get_items(self):
        """
        Returns the items that this data type instance embeds.

        @rtype: L{ObjectSet<porcupine.core.objectSet.ObjectSet>}
        """
        return ObjectSet([db._db.get_item(id)
                          for id in self.value])


class RequiredComposition(Composition):
    "Mandatory L{Composition} data type."
    isRequired = True

#==============================================================================
# External Attributes
#==============================================================================


class ExternalAttribute(DataType):
    """
    Subclass I{ExternalAttribute} when dealing with large attribute lengths.
    These kind of attributes are not stored on the same database as
    all other object attributes.

    @type is_dirty: bool
    @type value: str
    """
    _safetype = (bytes, type(None))
    _eventHandler = dteventhandlers.ExternalAttributeEventHandler

    def __init__(self, **kwargs):
        self._id = misc.generate_oid()
        self._reset()

    def _reset(self):
        self._value = None
        self._isDirty = False

    def __deepcopy__(self, memo):
        clone = copy.copy(self)
        duplicate = memo.get('_dup_ext_', False)
        if duplicate:
            clone._id = misc.generate_oid()
            clone.value = self.get_value()
        return clone

    def get_value(self, txn=None):
        "L{value} property getter"
        if self._value is None:
            self._value = db._db.get_external(self._id) or ''
        return self._value

    def set_value(self, value):
        "L{value} property setter"
        self._isDirty = True
        self._value = value
    value = property(get_value, set_value, None, "the actual value")

    def get_is_dirty(self):
        "L{is_dirty} property getter"
        return self._isDirty
    is_dirty = property(get_is_dirty, None, None,
                        "boolean indicating if the value has changed")


class Text(ExternalAttribute):
    """Data type to use for large text streams

    @type value: str
    """

    def __init__(self, **kwargs):
        ExternalAttribute.__init__(self, **kwargs)
        self._size = 0

    def set_value(self, value):
        ExternalAttribute.set_value(self, value)
        self._size = len(value)
    value = property(ExternalAttribute.get_value, set_value, None,
                     "text stream")

    def __len__(self):
        return self._size

    def validate(self):
        if self.isRequired and self._size == 0:
            raise ValueError(self.__class__.__name__, 'Attribute is mandatory')


class RequiredText(Text):
    "Mandatory L{Text} data type."
    isRequired = True


class File(Text):
    """Data type to use for file objects

    @ivar filename: the file's name
    @type filename: str
    """
    def __init__(self, **kwargs):
        Text.__init__(self, **kwargs)
        self.filename = ''

    def get_file(self):
        return io.StringIO(self.value)

    def load_from_file(self, fname):
        """
        This method sets the value property of this data type instance
        to a stream read from a file that resides on the file system.

        @param fname: A valid filename
        @type fname: str

        @return: None
        """
        oFile = open(fname, 'rb')
        self.value = oFile.read()
        oFile.close()


class RequiredFile(File):
    "Mandatory L{File} data type."
    isRequired = True


class ExternalFile(String):
    """
    Datatype for linking external files. Its value
    is a string which contains the path to the file.
    """
    _eventHandler = dteventhandlers.ExternalFileEventHandler
    removeFileOnDeletion = True
    isRequired = True

    def get_file(self, mode='rb'):
        return file(self.value, mode)

    def __deepcopy__(self, memo):
        clone = copy.copy(self)
        duplicate_files = memo.get('_dup_ext_', False)
        if duplicate_files:
            # copy the external file
            fcounter = 1
            old_filename = new_filename = self.value
            filename, extension = os.path.splitext(old_filename)
            filename = filename.split('_')[0]
            while os.path.exists(new_filename):
                new_filename = ('%s_%d%s' % (filename, fcounter, extension))
                fcounter += 1
            shutil.copyfile(old_filename, new_filename)
            clone.value = new_filename
        return clone


class RequiredExternalFile(ExternalFile):
    "Mandatory L{ExternalFile} data type."
    isRequired = True
