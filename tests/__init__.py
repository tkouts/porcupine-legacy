import unittest
import shutil
import sys
import os

from porcupine import db
from porcupine import context
from porcupine.administration import offlinedb

from . import schema


def get_module_path(name):
    return os.path.dirname(sys.modules[name].__file__) + '/'


class TestWithDb(unittest.TestCase):

    @classmethod
    @db.transactional(auto_commit=True)
    def write_root(cls):
        # write root folder
        root = schema.TestFolder()
        root._id = ''
        cls.odb.put_item(root)

    @classmethod
    def setup_class(cls):
        db_dir = get_module_path(__name__) + 'testdb/'
        if not os.path.isdir(db_dir):
            os.mkdir(db_dir)
        # open offline db
        cls.odb = offlinedb.get_handle(dir=db_dir)
        if cls.odb.get_item('') is None:
            # initialize db
            cls.write_root()
        context.user = schema.TestSystemUser()

    @classmethod
    def teardown_class(cls):
        # close db
        offlinedb.close()


class FilePreserver(unittest.TestCase):

    preserve_files = []

    @classmethod
    def setup_class(cls):
        for f in cls.preserve_files:
            shutil.copyfile(f, '%s.bak' % f)

    @classmethod
    def teardown_class(cls):
        for f in cls.preserve_files:
            shutil.move('%s.bak' % f, f)
            if f[-2:] == 'py':
                # remove compiled files
                compiled = [f + c for c in ('c', 'o')
                            if os.path.isfile(f + c)]
                [os.remove(f) for f in compiled]

