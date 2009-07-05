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
"""This module provides the essential API for runtime manipulation of the
custom Porcupine content classes and data types. It is mainly intended for
install/uninstall scripts packed with the B{pakager} deployment utility.
"""
import inspect
import sys
import types
import time
import re

from porcupine import db
from porcupine import datatypes
from porcupine import systemObjects
from porcupine.utils import misc
from porcupine.administration import offlinedb

class GenericSchemaEditor(object):
    def __init__(self, classobj):
        self._class = misc.get_rto_by_name(classobj)
        self._bases = self._class.__bases__
        self.doc = self._class.__doc__
        self._attrs = {}
        self._methods = {}
        self._properties = {}
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
        sub_attrs = []
        for base_class in self._class.__bases__:
            s = base_class()
            sub_attrs += s.__dict__.keys()
        for member_name in self._instance.__dict__:
            if not member_name in sub_attrs:
                self._attrs[member_name] = self._instance.__dict__[member_name]

        for member_name in self._class.__dict__:
            member = self._class.__dict__[member_name]
            if type(member) == types.FunctionType:
                self._methods[member_name] = member
            elif type(member) == property:
                self._properties[member_name] = member

        self._module = sys.modules[self._class.__module__]
        self._imports = {}
        
        moduledict = self._module.__dict__
        for x in moduledict:
            if type(moduledict[x]) == types.ModuleType:
                self._imports[moduledict[x]] = x
            elif callable(moduledict[x]) and \
                    (sys.modules[moduledict[x].__module__] != self._module):
                imported = misc.get_rto_by_name(moduledict[x].__module__ +
                                                '.' + moduledict[x].__name__)
                self._imports[imported] = moduledict[x].__name__
    
    def generate_code(self):
        raise NotImplementedError
    
    def _get_full_name(self, callable):
        if callable.__module__ == '__builtin__':
            return callable.__name__
        module = misc.get_rto_by_name(callable.__module__)
        if self._imports.has_key(module):
            return self._imports[module] + '.' + callable.__name__
        else:
            if module == self._module:
                return callable.__name__
            local_name = callable.__module__.split('.')[-1]
            counter = 2
            while local_name in self._module.__dict__:
                local_name += str(counter)
                counter += 1
            self._imports[module] = local_name
            return(local_name + '.' + callable.__name__)
    
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
            if line[:4]=='from' or line[:6]=='import':
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
            
    def commit_changes(self):
        if self.boundaries != None:
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
            
            modfile = file(modulefilename, 'w')
            modfile.writelines(new_source)
            modfile.close()
    # backwards compatibility
    commitChanges = commit_changes
        
class ItemEditor(GenericSchemaEditor):
    def __init__(self, classobj):
        GenericSchemaEditor.__init__(self, classobj)
        self._setProps = {}
        self._removedProps = []
        self.xform = None
        if issubclass(self._class, systemObjects.GenericItem):
            self.image = self._class.__image__
            if hasattr(self._class, '_eventHandlers'):
                self._eventHandlers = self._class._eventHandlers
            else:
                self._eventHandlers = []
            if hasattr(self._class, 'isCollection'):
                self.isCollection = self._class.isCollection
            else:
                self.isCollection = None
            if self.isCollection:
                self.containment = list(self._class.containment)
            else:
                self.containment = None
        else:
            raise TypeError, 'Invalid argument. ' + \
                'ItemEditor accepts only subclasses of GenericItem'
    
    def set_property(self, name, value):
        self._attrs[name] = value
        self._setProps[name] = value
    # kept for backwards compatibility  
    addProperty = set_property
    setProperty = set_property
    
    def remove_property(self, name):
        if self._attrs.has_key(name):
            del self._attrs[name]
            self._removedProps.append(name)
    # kept for backwards compatibility
    removeProperty = remove_property
    
    def commit_changes(self, generate_code=True):
        from porcupine.oql.command import OqlCommand
        if self._setProps or self._removedProps or self.xform:
            if generate_code:
                GenericSchemaEditor.commit_changes(self)
                # we must reload the class module
                oMod = misc.get_rto_by_name(self._class.__module__)
                reload(oMod)
            
            db_handle = offlinedb.get_handle()
            oql_command = OqlCommand()
            rs = oql_command.execute(
                "select * from deep('/') where instanceof('%s')" %
                self._instance.contentclass)
            try:
                if len(rs):
                    @db.transactional(auto_commit=True)
                    def _update_db():
                        for item in rs:
                            for name in self._removedProps:
                                if hasattr(item, name):
                                    delattr(item, name)
                            for name in self._setProps:
                                if not hasattr(item, name):
                                    # add new
                                    setattr(item, name, self._setProps[name])
                                else:
                                    # replace property
                                    old_value = getattr(item, name).value
                                    setattr(item, name, self._setProps[name])
                                    new_attr = getattr(item, name)
                                    if isinstance(new_attr, datatypes.Password):
                                        new_attr._value = old_value
                                    else:
                                        new_attr.value = old_value
                            if self.xform:
                                item = self.xform(item)
                            db_handle.put_item(item)
                    _update_db()
            finally:
                offlinedb.close()
    # backwards compatibility
    commitChanges = commit_changes
    
    def generate_code(self):
        bases = [self._get_full_name(x) for x in self._bases]
        ccbases = [self._get_full_name(x) for x in self._bases
                   if issubclass(x, systemObjects.GenericItem)]
        
        code = ['# auto generated by codegen at %s\n' % time.asctime()]
        code.append('class %s(%s):\n' % (self._class.__name__, ','.join(bases)))
        
        # doc
        code.append('    """%s"""\n' % self.doc)
        
        # __image__
        code.append('    __image__ = "%s"\n' % self.image)
        
        # props
        dts = ["'%s'" % prop for prop in self._attrs
               if isinstance(self._attrs[prop], datatypes.DataType)]
        if dts:
            code.append('    __props__ = ')
            if ccbases:
                code.append(' + '.join([x + '.__props__' for x in ccbases]) + ' + ')
            code.append('(' + ', '.join(dts) + ', )\n')
            
        # isCollection
        if (self.isCollection != None):
            code.append('    isCollection = %s\n' % self.isCollection)
        
        # _eventHandlers
        if (self._eventHandlers or not ccbases):
            handlers = [self._get_full_name(handler)
                        for handler in self._eventHandlers]
            code.append('    _eventHandlers = ')
            if ccbases:
                code.append(' + '.join([x + '._eventHandlers' for x in ccbases]) + ' + ')
            code.append('[' + ', '.join(handlers) + ']\n')
        
        # containment
        if self.containment:
            code.append('    containment = (\n')
            code.extend(["        '%s',\n" % x for x in self.containment])
            code.extend('    )\n')
        
        if self._attrs:
            # __init__
            code.append('\n')
            code.append('    def __init__(self):\n')
            code.extend(['        %s.__init__(self)\n' % x for x in bases])
            
            # props
            for prop in [x for x in self._attrs
                    if self._attrs[x].__class__.__module__ != '__builtin__']:
                code.append('        self.%s = %s()\n' %
                        (prop, self._get_full_name(self._attrs[prop].__class__)))
            for prop in [x for x in self._attrs
                    if self._attrs[x].__class__.__module__ == '__builtin__']:
                if prop != '_id':
                    code.append('        self.%s = %s\n' %
                            (prop, repr(self._attrs[prop])))
                else:
                    code.append('        self._id = misc.generateOID()\n')
        
        # methods
        for meth in self._methods:
            method = self._methods[meth]
            if method.__name__ != '__init__':
                code.append('\n')
                code.extend(inspect.getsourcelines(self._methods[meth])[0])
            
        # properties
        for property_name in self._properties:
            code.append('\n')
            prop_descriptor = self._properties[property_name]
            fget = fset = None
            if prop_descriptor.fget:
                fget = prop_descriptor.fget.__name__
            if prop_descriptor.fset:
                fset = prop_descriptor.fset.__name__
            code.extend('    %s = property(%s, %s)' %
                        (property_name, fget, fset))
        
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
            raise TypeError, 'Invalid argument. ' + \
                'DatatypeEditor accepts only subclasses of DataType'

    def generate_code(self):
        bases = [self._get_full_name(x) for x in self._bases]

        code = ['# auto generated by codegen at %s\n' % time.asctime()]
        code.append('class %s(%s):\n' % (self._class.__name__, ','.join(bases)))
        
        # doc
        doc = self.doc.split('\n')
        if len(doc)==1:
            code.append('    "%s"\n' % doc[0])
        else:
            code.append('    """\n')
            code.extend(['%s\n' % x for x in doc if x.strip()])
            code.append('    """\n')
        
        # isRequired
        code.append('    isRequired = %s\n' % str(self.isRequired))
        
        # relCc
        if self.relCc and (issubclass(self._class, datatypes.Reference1) or \
                           issubclass(self._class, datatypes.ReferenceN)):
            code.append('    relCc = (\n')
            code.extend(["        '%s',\n" % x for x in self.relCc])
            code.extend('    )\n')
        # relAttr
        if self.relAttr and (issubclass(self._class, datatypes.Relator1) or \
                             issubclass(self._class, datatypes.RelatorN)):
            code.append("    relAttr = '%s'\n" % self.relAttr)
        # compositeClass
        if self.compositeClass and \
                issubclass(self._class, datatypes.Composition):
            code.append("    compositeClass = '%s'\n" % self.compositeClass)
        
        if self._attrs:
            #__init__
            code.append('\n')
            code.append('    def __init__(self):\n')
            code.extend(['        %s.__init__(self)\n' % x for x in bases])
            
            # props
            for prop in [x for x in self._attrs
                    if self._attrs[x].__class__.__module__ != '__builtin__']:
                code.append('        self.%s = %s()\n' %
                        (prop, self._get_full_name(self._attrs[prop].__class__)))
            for prop in [x for x in self._attrs
                    if self._attrs[x].__class__.__module__ == '__builtin__']:
                code.append('        self.%s = %s\n' % 
                        (prop, repr(self._attrs[prop])))
        
        #methods
        for meth in self._methods:
            method = self._methods[meth]
            if method.__name__ != '__init__':
                code.append('\n')
                code.extend(inspect.getsourcelines(self._methods[meth])[0])
            
        #properties
        for property_name in self._properties:
            code.append('\n')
            prop_descriptor = self._properties[property_name]
            fget = fset = None
            if prop_descriptor.fget:
                fget = prop_descriptor.fget.__name__
            if prop_descriptor.fset:
                fset = prop_descriptor.fset.__name__
            code.extend('    %s = property(%s, %s)' %
                        (property_name, fget, fset))
        
        return code
