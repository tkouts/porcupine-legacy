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
Porcupine output filters
"""
import os
import glob
import gzip
import re
import io
from threading import RLock

from porcupine.utils import misc
from porcupine.filters.jsmin import JavascriptMinify
from porcupine.filters.filter import PostProcessFilter, PreProcessFilter


class Gzip(PostProcessFilter):
    """
    Compresses the server's output using
    the gzip compression algorithm.
    """
    cache_folder = None
    lock = RLock()
    staticLevel = 9
    dynamicLevel = 3

    @staticmethod
    def compress(input, output, level):
        zfile = gzip.GzipFile(mode='wb', fileobj=output, compresslevel=level)
        zfile.write(input)
        zfile.close()

    @staticmethod
    def apply(context, item, registration, **kwargs):
        if Gzip.cache_folder is None:
            config = Gzip.loadConfig()
            Gzip.cache_folder = config['cache']
            if not(os.path.isdir(Gzip.cache_folder)):
                os.makedirs(Gzip.cache_folder)
            Gzip.staticLevel = int(config['static_compress_level'])
            Gzip.dynamicLevel = int(config['dynamic_compress_level'])

        context.response.set_header('Content-Encoding', 'gzip')
        isStatic = (registration is not None and registration.type == 0)

        if isStatic:
            filename = registration.context
            modified = hex(int(os.path.getmtime(filename)))[2:]

            compressed = filename.replace(os.path.sep, '_')
            if os.name == 'nt':
                compressed = (compressed.replace(os.path.altsep, '_').
                              replace(':', ''))

            glob_f = '%s/%s' % (Gzip.cache_folder, compressed)
            compressed = '%s#%s.gzip' % (glob_f, modified)

            if not(os.path.exists(compressed)):
                Gzip.lock.acquire()
                try:
                    # remove old compressed files
                    oldfiles = glob.glob(glob_f + '*.gzip')
                    [os.remove(old) for old in oldfiles]
    
                    output = io.FileIO(compressed, 'wb')
                    Gzip.compress(context.response._get_body(),
                                  output,
                                  Gzip.staticLevel)
                    output.close()
                finally:
                    Gzip.lock.release()

            context.response.clear()
            cache_file = io.FileIO(compressed)
            context.response.write(cache_file.read())
            cache_file.close()

        else:
            output = io.BytesIO()
            Gzip.compress(
                context.response._get_body(), output, Gzip.dynamicLevel)
            context.response._body = output


class I18n(PostProcessFilter):
    """
    Internationalization filter based on the request's
    preferred language setting.
    """
    mutates_output = True
    _tokens = re.compile(b'(@@([\w\.]+)@@)', re.DOTALL)

    @staticmethod
    def apply(context, item, registration, **kwargs):
        language = context.request.get_lang()
        lst_resources = kwargs['using'].split(',')
        bundles = [misc.get_rto_by_name(x)
                   for x in lst_resources]
        output = context.response._body.getvalue()
        tokens = frozenset(re.findall(I18n._tokens, output))
        for token, key in tokens:
            for bundle in bundles:
                res = bundle.get_resource(key.decode(), language)
                if res != key:
                    break
            if isinstance(res, bytes):
                # python 2.6
                res = res.decode('utf-8')
            output = output.replace(
                token, res.encode(context.response.charset))
        context.response.clear()
        context.response.write(output)


class JSMin(PostProcessFilter):
    """
    Minifies JavaScript files using JSMin
    http://www.crockford.com/javascript/jsmin.html
    """
    cache_folder = None
    lock = RLock()

    @staticmethod
    def compress(input, output):
        input.seek(0)
        jsmin = JavascriptMinify()
        jsmin.minify(input, output)

    @staticmethod
    def apply(context, item, registration, **kwargs):
        if JSMin.cache_folder is None:
            config = JSMin.loadConfig()
            JSMin.cache_folder = config['cache']
            if not(os.path.isdir(JSMin.cache_folder)):
                os.makedirs(JSMin.cache_folder)

        is_static = (registration is not None and registration.type == 0)

        if is_static:
            filename = registration.context
            modified = hex(int(os.path.getmtime(filename)))[2:]

            minified = filename.replace(os.path.sep, '_')
            if os.name == 'nt':
                minified = (minified.replace(os.path.altsep, '_').
                            replace(':', ''))

            glob_f = '%s/%s' % (JSMin.cache_folder, minified)
            minified = '%s#%s.jsmin' % (glob_f, modified)

            if not(os.path.exists(minified)):
                JSMin.lock.acquire()
                try:
                    # remove old compressed files
                    oldfiles = glob.glob(glob_f + '*.jsmin')
                    [os.remove(old) for old in oldfiles]

                    output = io.BytesIO()
                    JSMin.compress(context.response._body, output)
                    context.response._body = output
                    open(minified, 'wb').write(output.getvalue())
                finally:
                    JSMin.lock.release()
            else:
                context.response.clear()
                context.response.write(open(minified, 'rb').read())

        else:
            output = io.BytesIO()
            JSMin.compress(context.response._body, output)
            context.response._body = ouput


class JSMerge(PreProcessFilter):
    """
    Merges a set of JavaScript files (or potentially
    any other text based formats) into one file.
    """
    cache_folder = None
    lock = RLock()

    @staticmethod
    def get_revision(files):
        return max([int(os.path.getmtime(f.strip()))
                    for f in files])

    @staticmethod
    def apply(context, item, registration, **kwargs):
        if JSMerge.cache_folder is None:
            config = JSMerge.loadConfig()
            JSMerge.cache_folder = config['cache']
            if not(os.path.isdir(JSMerge.cache_folder)):
                os.makedirs(JSMerge.cache_folder)

        files = [f.strip() for f in kwargs['files'].split(',')]

        # check if output folder exists
        path = registration.path
        hash = misc.hash(*files).hexdigest()

        merged = path.replace(os.path.sep, '_')
        if os.name == 'nt':
            merged = merged.replace(os.path.altsep, '_').replace(':', '')

        glob_f = '%s/%s' % (JSMerge.cache_folder, merged)
        merged = '%s#%s.merge.js' % (glob_f, hash)

        revision = int(context.request.queryString['r'][0])

        if (not os.path.isfile(merged) or
                os.path.getmtime(merged) < revision):
            JSMerge.lock.acquire()
            try:
                # remove old merged files
                oldfiles = glob.glob(glob_f + '*')
                [os.remove(old) for old in oldfiles]
                # generate new
                f = open(merged, 'w')
                for fname in files:
                    f.write(open(fname, 'r').read() + '\n')
                f.close()
            finally:
                JSMerge.lock.release()

        registration.context = merged
