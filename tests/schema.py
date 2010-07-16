"""
Sample content classes used for testing pupropes
"""

import os
from porcupine import events
from porcupine import systemObjects
from porcupine import datatypes as dt
# get_rto_by_name is unused import
from porcupine.utils.misc import get_rto_by_name, generate_oid
# used import
from porcupine.utils.misc import get_address_from_string


# invalid class

class Invalid(object):
    name = os.name
    address = get_address_from_string('localhost:80')


# data types

class TestRelator(dt.Relator1):
    "test relator"

    relCc = ('tests.schema.TestItemEmpty', )
    relAttr = 'some_attr'


class TestComposition(dt.Composition):
    "test composition"

    compositeClass = 'some.composite.class'


class TestDtAttributes(dt.String):
    "a test datatype with custom attributes"

    def __init__(self):
        dt.String.__init__(self)
        self.y = 'custom'


class NestedDatatype(dt.List):

    def __init__(self):
        dt.List.__init__(self)
        self.y = dt.String()


class InvalidDatatype(object):
    pass


# event handlers

class TestEventHandler(events.ContentclassEventHandler):
    pass


class InvalidEventHandler(object):
    pass

# content classes


class TestSystemUser(systemObjects.Item):
    "system user used for tests"

    def is_admin(self):
        return True


class TestGenericItem(systemObjects._Elastic):
    "class for testing codegen editing of generic items"

    __image__ = "desktop/images/object.gif"
    __props__ = {'displayName': dt.RequiredString,
                 'description': dt.String}
    isCollection = False
    _eventHandlers = []

    def __init__(self):
        # wrong assignment of _id
        self._id = 'id'


class TestFolder(systemObjects.Container):
    "This is a test container"

    __props__ = dict({'x': dt.String},
                     **systemObjects.Container.__props__)
    containment = ('tests.schema.TestFolder', 'tests.schema.TestItem')

    def __init__(self):
        systemObjects.Container.__init__(self)
        self.y = 'custom'


class TestItem(systemObjects.Item):

    __props__ = dict({'x': dt.String, 'c': TestComposition},
                     **systemObjects.Item.__props__)

    def some_mehtod(self):
        return 'method called'

    def getter(self):
        return 'getter'
    
    def setter(self, value):
        pass
    
    p = property(getter, setter)


class TestMultipleBasesItem(TestGenericItem, TestItem, systemObjects.Movable):

    isCollection = False
