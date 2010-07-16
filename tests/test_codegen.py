import sys

try:
    from . import FilePreserver, get_module_path
except (ValueError, ImportError):
    from __init__ import FilePreserver, get_module_path

try:
    from . import schema
except (ValueError, ImportError):
    from __init__ import FilePreserver, get_module_path

from porcupine import datatypes
from porcupine.administration import codegen

class ExternalDatatype(datatypes.String):
    pass

class CodegenTest(FilePreserver):

    preserve_files = [get_module_path(__name__) + 'schema.py']

    def test_invalid_class(self):
        self.assertRaises(TypeError, codegen.ItemEditor,
                          'tests.schema.Invalid')

    def test_generate_code_not_implemented(self):
        editor = codegen.GenericSchemaEditor('tests.schema.Invalid')
        self.assertRaises(NotImplementedError, editor.generate_code)

    def test_compiled_module_filename(self):
        editor = codegen.ItemEditor('tests.schema.TestItem')
        editor._module.__file__ += 'c'
        try:
            editor.commit_changes()
        finally:
            editor._module.__file__ = editor._module.__file__[:-1]

    # content class tests
    def test_generic_item(self):
        editor = codegen.ItemEditor('tests.schema.TestGenericItem')
        editor.set_property('z', datatypes.String())
        editor.commit_changes()

        item = schema.TestGenericItem()
        self.assertEqual(item.z.value, '')
        self.assertNotEqual(item._id, 'id')

    def test_multiple_inheritance(self):
        editor = codegen.ItemEditor('tests.schema.TestMultipleBasesItem')
        editor.set_property('y', datatypes.String())
        editor.commit_changes()

        item = schema.TestMultipleBasesItem()
        self.assertEqual(hasattr(item, 'x'), True)
        self.assertEqual(item.x.value, '')
        self.assertEqual(hasattr(item, 'y'), True)
        self.assertEqual(item.y.value, '')
        self.assertEqual(hasattr(item, 'z'), True)
        self.assertEqual(item.z.value, '')
        self.assertEqual(hasattr(item, 'c'), True)
        self.assertEqual(item.c.value, [])

    def test_datatype_addition(self):
        editor = codegen.ItemEditor('tests.schema.TestItem')
        editor.set_property('z', datatypes.String())
        editor.commit_changes()

        item = schema.TestItem()
        self.assertEqual(item.z.value, '')

    def test_datatype_removal(self):
        editor = codegen.ItemEditor('tests.schema.TestItem')
        editor.remove_property('z')
        editor.commit_changes()

        item = schema.TestItem()
        self.assertRaises(AttributeError, getattr, item, 'z')

    def test_datatype_addition_with_default_value(self):
        editor = codegen.ItemEditor('tests.schema.TestItem')
        editor.set_property('z', datatypes.String(value='Test'))
        editor.commit_changes()

        item = schema.TestItem()
        self.assertEqual(item.z.value, 'Test')

    def test_external_datatype_addition(self):
        editor = codegen.ItemEditor('tests.schema.TestItem')
        editor.set_property('ex', ExternalDatatype())
        editor.commit_changes()

        item = schema.TestItem()
        self.assertEqual(item.ex.value, '')

    def test_attribute_addition(self):
        editor = codegen.ItemEditor('tests.schema.TestItem')
        editor.set_property('y', 1)
        editor.commit_changes()

        item = schema.TestItem()
        self.assertEqual(item.y, 1)

    def test_attribute_removal(self):
        editor = codegen.ItemEditor('tests.schema.TestItem')
        editor.remove_property('y')
        editor.commit_changes()

        item = schema.TestItem()
        self.assertRaises(AttributeError, getattr, item, 'y')

    def test_event_handlers(self):
        editor = codegen.ItemEditor('tests.schema.TestFolder')
        editor._eventHandlers.append(schema.TestEventHandler)
        editor.commit_changes()

        folder = schema.TestFolder()
        self.assertEqual(folder._eventHandlers, [schema.TestEventHandler])

    def test_invalid_event_handler(self):
        editor = codegen.ItemEditor('tests.schema.TestFolder')
        editor._eventHandlers.append(schema.InvalidEventHandler)
        self.assertRaises(TypeError, editor.commit_changes)

    def test_class_members(self):
        doc = '''new multiline doc
            new line'''
        e = codegen.ItemEditor('tests.schema.TestItem')
        e.set_doc(doc)
        e.commit_changes()

        self.assertEqual(schema.TestItem.__doc__, doc)
        item = schema.TestItem()
        self.assertEqual(item.some_mehtod(), 'method called')
        self.assertEqual(item.p, 'getter')

    # datatype tests

    def test_relcc(self):
        e = codegen.DatatypeEditor('tests.schema.TestRelator')
        e.relCc.append('tests.schema.TestItem')
        e.commit_changes()

        self.assertEqual(schema.TestRelator.relCc, tuple(set((
            'tests.schema.TestItemEmpty', 'tests.schema.TestItem'))))

    def test_relattr(self):
        e = codegen.DatatypeEditor('tests.schema.TestRelator')
        e.relAttr = 'another_attr'
        e.commit_changes()

        self.assertEqual(schema.TestRelator.relAttr, 'another_attr')

    def test_composite_class(self):
        e = codegen.DatatypeEditor('tests.schema.TestComposition')
        e.compositeClass = 'another.composite'
        e.commit_changes()

        self.assertEqual(schema.TestComposition.compositeClass,
                         'another.composite')

    def test_datatype_custom_attributes(self):
        e = codegen.DatatypeEditor('tests.schema.TestDtAttributes')
        print e._attrs
        e.commit_changes()

        dt = schema.TestDtAttributes()
        self.assertEqual(dt.y, 'custom')
        # make sure base class is called
        self.assertEqual(dt.value, '')

    def test_nested_datatype(self):
        e = codegen.DatatypeEditor('tests.schema.NestedDatatype')
        self.assertRaises(TypeError, e.commit_changes)

    def test_invalid_datatype(self):
        self.assertRaises(TypeError, codegen.DatatypeEditor,
                          'tests.schema.InvalidDatatype')
