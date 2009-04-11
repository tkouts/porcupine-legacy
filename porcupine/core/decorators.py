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
"Base classes of decorators applied to web methods"
import hashlib
import types
import os.path
import sys
import traceback

from porcupine import exceptions
from porcupine.utils import permsresolver
from porcupine.config.settings import settings

def deprecated(function, member=None):
    """
    Wrapper for deprecated API calls
    """
    def dep_wrapper(*args, **kwargs):
        from porcupine.core.runtime import logger
        upper_stack = traceback.extract_stack()[-2]
        pfile, line_no, where, line = upper_stack
        logger.warning(
            "DEPRECATION WARNING\n" +
            "File \"%s\".\n" % pfile +
            "Line %d:\n    %s\nin \"%s\". " % (line_no, line, where) +
            "Use \"%s\" instead." % (member or function.func_name))
        return function(*args, **kwargs)
    dep_wrapper.func_name = function.func_name
    return dep_wrapper

class WebMethodDescriptor(object):
    def __init__(self, function, of_type, conditions,
                 content_type, encoding, max_age,
                 template, template_engine):
        self.func = function
        self.conditions = conditions
        self.func_name = 'WM_%s_%s' % (function.func_name,
                                       hashlib.md5(str(self.conditions)).hexdigest())
        # response parameters
        self.content_type = content_type
        self.encoding = encoding
        self.max_age = max_age
        #template parameters
        self.template = template
        self.t_engine = template_engine
        # monkey patching
        self.of_type = of_type
        setattr(of_type, self.func_name, self)
        
    def __call__(self, *args, **kwargs):
        return self.func(*args, **kwargs)
    
    def __get__(self, item, item_class):
        def wm_wrapper(item, context):
            if permsresolver.get_access(item, context.user) == 0:
                raise exceptions.PermissionDenied
            context.response.content_type = self.content_type
            context.response.charset = self.encoding
            if self.max_age:
                context.response.set_expiration(self.max_age)
            return self.execute(item, context)
        wm_wrapper.func_name = self.func_name
        wm_wrapper.func_doc = self.func.func_doc
        wm_wrapper.func_dict['cnd'] = self.conditions
        return types.MethodType(wm_wrapper, item, item_class)
    
    def execute(self, item, context):
        v = self.func(item)
        if self.template != None:
            func_dir = os.path.dirname(sys.modules[self.func.__module__].__file__)
            template_processor = settings['templatelanguages'][self.t_engine]
            template_processor(context,
                               '%s%s%s' % (func_dir, os.path.sep, self.template),
                               v)

class WebMethodWrapper(object):
    def __init__(self, decorator):
        self.decorator = decorator
        self.func = decorator.func
        self.func_name = decorator.func_name
        self.conditions = decorator.conditions
        # monkey patching
        self.of_type =  decorator.of_type
        setattr(self.of_type, self.func_name, self)
        
    def __call__(self, *args, **kwargs):
        return self.func(*args, **kwargs)

    def __get__(self, item, item_class):
        wrapper = self.get_wrapper()
        wrapper.func_name = self.func_name
        wrapper.func_doc = self.func.func_doc
        wrapper.func_dict['cnd'] = self.conditions
        return types.MethodType(wrapper, item, item_class)
    
    def get_wrapper(self):
        raise NotImplementedError
  