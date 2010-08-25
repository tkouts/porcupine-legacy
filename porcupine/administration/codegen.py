#==============================================================================
#   Copyright (c) 2005-2010, Tassos Koutsovassilis
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
This module provides the essential API for runtime manipulation of the
custom Porcupine content classes and data types.
It is mainly intended for install/uninstall scripts packed with the
B{pakager} deployment utility.
"""
import inspect
import sys
import types
import time
import re
import linecache
import os
from threading import RLock

from porcupine import datatypes
from porcupine import events
from porcupine import systemObjects
from porcupine.config.services import services
from porcupine.utils import misc
from porcupine.core.decorators import synchronized


class GenericSchemaEditor(object):

    lock = RLock()

    def __init__(self, classobj):
        self._class = misc.get_rto_by_name(classobj)
        self._bases = self._class.__bases__
        self._doc = self._class.__doc__
        self._attrs = {}
        self._methods = {}
        self._properties = {}
        self._module = sys.modules[self._class.__module__]

        # check line cache
        linecache.checkcache(filename=self._module.__file__)

        try:
            sourcelines = inspect.getsourcelines(self._class)
            startline = sourcelines[1]
            endline = startline + len(sourcelines[0]) - 1
            self.boundaries = (startline, endline)
        except IOError:
            # the source file does not exist
            self.boundaries = None

        self._instance = self._class()

        # find instance attributes
        sub_attrs = {}
        for base_class in self._class.__bases__:
            s = base_class()
            if hasattr(s, '__dict__'):
                sub_attrs.update(s.__dict__)
        for member_name in self._instance.__dict__:
            if not member_name in sub_attrs:
                self._attrs[member_name] = self._instance.__dict__[member_name]

        # find methods and properties
        for member_name in self._class.__dict__:
            member = self._class.__dict__[member_name]
            if type(member) == types.FunctionType:
                self._methods[member_name] = member
            elif type(member) == property:
                self._properties[member_name] = member

        self._imports = {}

        # locate imports
        moduledict = self._module.__dict__
        for x in moduledict:
            if type(moduledict[x]) == types.ModuleType:
                self._imports[moduledict[x]] = x
            elif hasattr(moduledict[x], '__call__') and \
                    (sys.modules[moduledict[x].__module__] != self._module):
                imported = misc.get_rto_by_name(moduledict[x].__module__ +
                                                '.' + moduledict[x].__name__)
                self._imports[imported] = moduledict[x].__name__

    def generate_code(self):
        raise NotImplementedError

    def _get_full_name(self, callable):
        # if it is built-in just return its name
        if callable.__module__ == None.__class__.__module__:
            return callable.__name__

        module = misc.get_rto_by_name(callable.__module__)
        if module in self._imports:
            # the callables module is already imported
            return self._imports[module] + '.' + callable.__name__
        else:
            if module == self._module:
                # the callable belongs to the current module
                return callable.__name__

            # the callable is not imported
            local_name = callable.__module__.split('.')[-1]
            #counter = 2
            #while local_name in self._module.__dict__:
            #    local_name += str(counter)
            #    counter += 1
            self._imports[module] = local_name
            return local_name + '.' + callable.__name__

    def _generate_imports(self):
        imports_code = []
        for mod in self._imports:
            if type(mod) == types.ModuleType:
                if mod.__name__ == self._imports[mod]:
                    imports_code.append('import ' + mod.__name__ + '\n')
                else:
                    modname = '.'.join(mod.__name__.split('.')[:-1])
                    attrname = mod.__name__.split('.')[-1]
                    if attrname == self._imports[mod]:
                        imports_code.append('from %s import %s\n' %
                            (modname, self._imports[mod]))
                    else:
                        imports_code.append('from %s import %s as %s\n' %
                            (modname, attrname, self._imports[mod]))
            else:
                imports_code.append('from %s import %s\n' %
                    (mod.__module__, self._imports[mod]))
        return imports_code

    def _remove_imports(self, sourcelines):
        import_lines = []
        for lineno, line in enumerate(sourcelines):
            if line[:4] == 'from' or line[:6] == 'import':
                import_lines.append(lineno)
        import_lines.reverse()
        for lineno in import_lines:
            del sourcelines[lineno]
        return min(import_lines)

    def _cleanup_imports(self, sourcelines):
        source = '\n'.join(sourcelines)
        # remove strings/comments from source
        strings = re.compile("'{1,3}.+?'{1,3}|\"{1,3}.+?\"{1,3}", re.DOTALL)
        source = re.sub(strings, '', source)
        # TODO: remove comments too
        unused = []
        for module in self._imports:
            if self._imports[module] not in source:
                unused.append(module)
        for module in unused:
            del self._imports[module]

    def _write_methods(self, code, excluding=['__init__']):
        for meth in self._methods:
            method = self._methods[meth]
            if method.__name__ not in excluding:
                code.append('\n')
                code.extend(inspect.getsourcelines(self._methods[meth])[0])

    def _write_properties(self, code):
        for property_name in self._properties:
            code.append('\n')
            prop_descriptor = self._properties[property_name]
            fget = fset = None
            if prop_descriptor.fget:
                fget = prop_descriptor.fget.__name__
            if prop_descriptor.fset:
                fset = prop_descriptor.fset.__name__
            code.extend('    %s = property(%s, %s)\n' %
                        (property_name, fget, fset))

    def set_doc(self, doc):
        self._doc = doc

    @synchronized(lock)
    def commit_changes(self):
        if self.boundaries is not None:
            module_source = inspect.getsourcelines(self._module)[0]
            new_source = module_source[:self.boundaries[0] - 1]
            new_source.extend(self.generate_code())
            new_source.extend(module_source[self.boundaries[1]:])

            imports_line = self._remove_imports(new_source)
            self._cleanup_imports(new_source)
            new_imports = self._generate_imports()
            for no, imprt in enumerate(new_imports):
                new_source.insert(imports_line + no, imprt)

            modulefilename = self._module.__file__
            if modulefilename[-1] in ['c', 'o']:
                modulefilename = modulefilename[:-1]

            modfile = open(modulefilename, 'w')
            modfile.writelines(new_source)
            modfile.close()

            # we must reload the class module
            misc.reload_module(self._module)
            # reload module in multi-processing enviroments
            services.notify(('RELOAD_MODULE', self._module.__name__))

    # backwards compatibility
    commitChanges = commit_changes


class ItemEditor(GenericSchemaEditor):

    def __init__(self, classobj):
        GenericSchemaEditor.__init__(self, classobj)
        # transformation function
        self.xform = None

        if issubclass(self._class, systemObjects._Elastic):
            self.image = self._class.__image__

            # event handlers
            try:
                self._eventHandlers = object.__getattr__(self._class, '_eventHandlers')[:]
            except AttributeError:
                self._eventHandlers = []

            # containment
            if self._class.isCollection:
                self.containment = list(self._class.containment)
            else:
                self.containment = None

        else:
            raise TypeError('Invalid argument. ItemEditor accepts only '
                            'subclasses of _Elastic')

    def set_property(self, name, value):
        self._attrs[name] = value

    # kept for backwards compatibility
    addProperty = set_property
    setProperty = set_property

    def remove_property(self, name):
        if name in self._attrs:
            del self._attrs[name]

    # kept for backwards compatibility
    removeProperty = remove_property

    def _generate_bases_props(self, bases):
        if len(bases) == 1:
            return '**%s.__props__' % bases[0]
        else:
            base = bases.pop(0)
            return '**dict(%s.__props__, %s)' % (base, self._generate_bases_props(bases))

    def generate_code(self):
        bases = [self._get_full_name(x) for x in self._bases]
        ccbases = [self._get_full_name(x) for x in self._bases
                   if issubclass(x, systemObjects._Elastic)]

        code = ['# auto generated by codegen at %s\n' % time.asctime()]
        code.append('class %s(%s):\n' %
                    (self._class.__name__, ', '.join(bases)))

        # doc
        if self._doc:
            code.append('    """%s"""\n\n' % self._doc)
        else:
            code.append('\n')

        # __image__
        code.append('    __image__ = "%s"\n' % self.image)

        # data types
        datatp = []
        for attr_name, attr in self._attrs.items():
            if isinstance(attr, datatypes.DataType):
                full_name = self._get_full_name(attr.__class__)
                if attr.value == attr._default:
                    datatp.append("'%s': %s" % (attr_name, full_name))
                else:
                    datatp.append("'%s': (%s, [], {'value': %r})" %
                                  (attr_name, full_name, attr.value))

        if datatp:
            code.append('    __props__ = dict({')
            code.append(', '.join(datatp) + '}')
            if ccbases:
                code.append(', ')
                code.append(self._generate_bases_props(ccbases))
            code.append(')\n')

        # _eventHandlers
        if (self._eventHandlers or not ccbases):
            # check handlers validity
            if [h for h in self._eventHandlers
                if not issubclass(h, events.ContentclassEventHandler)]:
                raise TypeError('Invalid event handler')

            handlers = [self._get_full_name(handler)
                        for handler in self._eventHandlers]
            code.append('    _eventHandlers = ')
            if ccbases:
                code.append(
                    ' + '.join([x + '._eventHandlers' for x in ccbases]) +
                    ' + ')
            code.append('[' + ', '.join(handlers) + ']\n')

        # containment
        if self.containment:
            code.append('    containment = (\n')
            code.extend(["        '%s',\n" % x for x in self.containment])
            code.extend('    )\n')

        # other attributes
        attrs = [x for x in self._attrs
                 if self._attrs[x].__class__.__module__ ==
                 None.__class__.__module__]
        if attrs:
            # __init__
            code.append('\n')
            code.append('    def __init__(self):\n')
            code.extend(['        %s.__init__(self)\n' % x for x in bases])

            # generate code for non-datatype attributes
            for prop in attrs:
                if prop != '_id':
                    code.append(
                        '        self.%s = %r\n' % (prop, self._attrs[prop]))
                else:
                    code.append('        self._id = %s()\n' %
                                self._get_full_name(misc.generate_oid))

        # methods
        self._write_methods(code)

        # properties
        self._write_properties(code)

        return code


class DatatypeEditor(GenericSchemaEditor):

    def __init__(self, classobj):
        GenericSchemaEditor.__init__(self, classobj)
        if issubclass(self._class, datatypes.DataType):
            self.isRequired = self._class.isRequired
            self.relCc = None
            self.relAttr = None
            self.compositeClass = None
            if hasattr(self._class, 'relCc'):
                self.relCc = list(self._class.relCc)
            if hasattr(self._class, 'relAttr'):
                self.relAttr = self._class.relAttr
            if hasattr(self._class, 'compositeClass'):
                self.compositeClass = self._class.compositeClass
        else:
            raise TypeError('Invalid argument. '
                'DatatypeEditor accepts only subclasses of DataType')

    def generate_code(self):
        bases = [self._get_full_name(x) for x in self._bases]

        code = ['# auto generated by codegen at %s\n' % time.asctime()]
        code.append('class %s(%s):\n' %
                    (self._class.__name__, ','.join(bases)))

        # doc
        if self._doc:
            code.append('    """%s"""\n\n' % self._doc)
        else:
            code.append('\n')

        # isRequired
        code.append('    isRequired = %r\n' % self.isRequired)

        # relCc
        if self.relCc and issubclass(self._class, (datatypes.Reference1,
                                                   datatypes.ReferenceN)):
            # remove duplicates
            self.relCc = tuple(set(self.relCc))
            code.append('    relCc = (\n')
            code.extend(["        '%s',\n" % x for x in self.relCc])
            code.extend('    )\n')

        # relAttr
        if self.relAttr and issubclass(self._class, (datatypes.Relator1,
                                                     datatypes.RelatorN)):
            code.append("    relAttr = '%s'\n" % self.relAttr)

        # compositeClass
        if self.compositeClass and \
                issubclass(self._class, datatypes.Composition):
            code.append("    compositeClass = '%s'\n" % self.compositeClass)

        if self._attrs:
            # __init__
            code.append('\n')
            code.append('    def __init__(self):\n')
            code.extend(['        %s.__init__(self)\n' % x for x in bases])

            # props
            for prop in [x for x in self._attrs
                         if self._attrs[x].__class__.__module__ !=
                            None.__class__.__module__]:
                raise TypeError('Datatypes cannot contain other datatypes')

            for prop in [x for x in self._attrs
                         if self._attrs[x].__class__.__module__ ==
                            None.__class__.__module__]:
                code.append(
                    '        self.%s = %s\n' %
                    (prop, repr(self._attrs[prop])))

        # methods
        self._write_methods(code)

        # properties
        self._write_properties(code)

        return code
