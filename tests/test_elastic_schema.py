import unittest

from porcupine import datatypes
from porcupine import systemObjects
from porcupine import db
from porcupine.administration import offlinedb

from org.innoscript.desktop.schema import common


class ElasticSchemaTest(unittest.TestCase):

    odb = offlinedb.get_handle()

    @classmethod
    def teardown_class(self):
        offlinedb.close()

    def test_datatype_addition(self):
        systemObjects.Item.__props__['x'] = datatypes.String
        try:
            item = systemObjects.Item()
            self.assertEqual(item.x.value, '')
        finally:
            del systemObjects.Item.__props__['x']

    def test_datatype_removal(self):
        # remove description from Item content class
        description = systemObjects.Item.__props__.pop('description')
        try:
            item = systemObjects.Item()
            self.assertRaises(AttributeError, getattr, item, 'description')
        finally:
            systemObjects.Item.__props__['description'] = description

    def test_datatype_addition_with_default_value(self):
        systemObjects.Item.__props__['x'] = (datatypes.String, [],
                                             {'value': 'default'})
        try:
            item = systemObjects.Item()
            self.assertEqual(item.x.value, 'default')
        finally:
            del systemObjects.Item.__props__['x']

    def _get_folder(self):
        folder = common.Folder()
        folder.displayName.value = 'test elastic schema'
        folder.description.value = 'description...'
        return folder

    @db.transactional(auto_commit=True)
    def test_datatype_addition_persistent(self):
        common.Folder.__props__['x'] = (datatypes.String, [],
                                        {'value': 'default'})
        # create new folder
        folder = self._get_folder()
        # add it to the root folder
        folder.append_to('')
        try:
            # reload it
            folder2 = db.get_item(folder.id)
            self.assertEqual(folder2.x.value, 'default')
        finally:
            folder.delete()
            # remove added attribute from schema
            del common.Folder.__props__['x']

    @db.transactional(auto_commit=True)
    def test_datatype_removal_persistent(self):
        # create a new folder
        folder = self._get_folder()
        # now remove the description data type
        description = common.Folder.__props__.pop('description')
        # add it to the root folder
        folder.append_to('')
        try:
            # update it in order for schema updates to persist
            folder.update()

            # reload it
            folder2 = db.get_item(folder.id)
            self.assertRaises(AttributeError, getattr, folder2, 'description')
        finally:
            # remove item
            folder.delete()
            # add description back
            common.Folder.__props__['description'] = description
