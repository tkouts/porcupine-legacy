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
Template languages processors
"""
import io
import os.path
from string import Template

from porcupine import exceptions
from porcupine.core import normaltemplate
from porcupine.core.normaltemplate import preprocessor
from porcupine.utils import misc


def _get_template_src(filename):
    try:
        f = io.open(filename, encoding='utf-8')
    except IOError:
        raise exceptions.NotFound('Template file "%s" is missing' % filename)
    try:
        src = f.read()
    finally:
        f.close()
    return src


def string_template(context, filename, vars):
    template = Template(_get_template_src(filename))
    context.response.write(template.substitute(vars))


_normal_cache = {}


def normal_template(context, filename, vars):
    tag = misc.generate_file_etag(filename)
    src = _get_template_src(filename)

    # process includes
    src = preprocessor.expand_includes(src)

    # extract data from base-template
    src, data = preprocessor.extract_data(src)
    if data:
        for var in data:
            cache_key = '%s#def%s' % (filename, var)
            cache_tag, fn = _normal_cache.get(cache_key, (None, None))
            if cache_tag != tag:
                fn = normaltemplate.compile(data[var])
                _normal_cache[cache_key] = (tag, fn)
            vars[var] = fn(vars)

    # detect super-template
    super = preprocessor.get_template_path(src)
    if super is not None:
        super_path = '%s/%s' % (os.path.dirname(filename), super)
        tag = misc.generate_file_etag(super_path)
        cache_tag, super_fn = _normal_cache.get(super_path, (None, None))
        if cache_tag != tag:
            st_src = _get_template_src(super_path)
            super_fn = normaltemplate.compile(st_src)
            _normal_cache[super_path] = (tag, super_fn)
        src = super_fn(vars)
        fn = normaltemplate.compile(src)
    else:
        cache_tag, fn = _normal_cache.get(filename, (None, None))
        if cache_tag != tag:
            # compile
            fn = normaltemplate.compile(src)
            _normal_cache[filename] = (tag, fn)

    context.response.write(fn(vars))
