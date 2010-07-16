try:
    from . import TestWithDb
except ValueError:
    from __init__ import TestWithDb

from porcupine import datatypes
from porcupine import db

from . import schema


class ElasticSchemaTest(TestWithDb):

    def test_datatype_addition(self):
        schema.TestItem.__props__['z'] = datatypes.String
        try:
            item = schema.TestItem()
            self.assertEqual(item.z.value, '')
        finally:
            del schema.TestItem.__props__['z']

    def test_datatype_removal(self):
        # remove x from Item content class
        x = schema.TestItem.__props__.pop('x')
        try:
            item = schema.TestItem()
            self.assertRaises(AttributeError, getattr, item, 'x')
        finally:
            schema.TestItem.__props__['x'] = x

    def test_datatype_addition_with_default_value(self):
        schema.TestItem.__props__['z'] = (datatypes.String, [],
                                          {'value': 'default'})
        try:
            item = schema.TestItem()
            self.assertEqual(item.z.value, 'default')
        finally:
            del schema.TestItem.__props__['z']

    def _get_folder(self):
        folder = schema.TestFolder()
        folder.displayName.value = 'test elastic schema'
        folder.description.value = 'description...'
        return folder

    @db.transactional(auto_commit=True)
    def test_datatype_addition_persistent(self):
        schema.TestFolder.__props__['z'] = (datatypes.String, [],
                                            {'value': 'default'})
        # create new folder
        folder = self._get_folder()
        # add it to the root folder
        folder.append_to('')
        try:
            # reload it
            folder2 = db.get_item(folder.id)
            self.assertEqual(folder2.z.value, 'default')
        finally:
            folder.delete()
            # remove added attribute from schema
            del schema.TestFolder.__props__['z']

    @db.transactional(auto_commit=True)
    def test_datatype_removal_persistent(self):
        # create a new folder
        folder = self._get_folder()
        # now remove the description data type
        description = schema.TestFolder.__props__.pop('x')
        # add it to the root folder
        folder.append_to('')
        try:
            # update it in order for schema updates to persist
            folder.update()

            # reload it
            folder2 = db.get_item(folder.id)
            self.assertRaises(AttributeError, getattr, folder2, 'x')
        finally:
            # remove item
            folder.delete()
            # add description back
            schema.TestFolder.__props__['x'] = description
