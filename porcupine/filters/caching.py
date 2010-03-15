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
Porcupine HTTP caching filters
"""
import sys
import os.path
import struct

from porcupine.filters.filter import PreProcessFilter
from porcupine.utils import misc


class ETag(PreProcessFilter):
    @staticmethod
    def generate_webmethod_etag(context, item, registration, wrapper):
        if item is not None:
            # locate web method's descriptor
            filter_class = wrapper.__class__
            while wrapper.__class__.__module__ == filter_class.__module__:
                wrapper = wrapper.decorator

            method_id = [context.user._id,
                         struct.pack('>d', item.modified),
                         struct.pack('>q', hash(tuple(item.__props__.keys()))),
                         context.request.get_lang()]
            try:
                # python 2.6
                func_code = wrapper.func.func_code
            except AttributeError:
                # python 3
                func_code = wrapper.func.__code__
            method_id.append(func_code.co_code)
            method_id.append(struct.pack('>q', hash(func_code.co_varnames)))
            # exclude None from consts
            method_id.append(struct.pack('>q', hash(func_code.co_consts[1:])))

            if wrapper.template is not None:
                func_dir = os.path.dirname(
                    sys.modules[wrapper.func.__module__].__file__)
                template_file = '%s%s%s' % (func_dir, os.path.sep,
                                            wrapper.template)
                method_id.append(misc.generate_file_etag(template_file))
            return misc.hash(*method_id).hexdigest()

    @staticmethod
    def apply(context, item, registration, **kwargs):
        etag = kwargs['generator'](
            context, item, registration, kwargs['wrapper'])
        if etag:
            response = context.response
            if_none_match = context.request.HTTP_IF_NONE_MATCH
            if if_none_match is not None and if_none_match == '"%s"' % etag:
                response._code = 304
                response.end()
            else:
                response.set_header('ETag', '"%s"' % etag)
