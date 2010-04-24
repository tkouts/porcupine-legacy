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
Porcupine output filters
"""
import os
import glob
import gzip
import re
import io

from porcupine.utils import misc
from porcupine.filters.jsmin import JavascriptMinify
from porcupine.filters.filter import PostProcessFilter


class Gzip(PostProcessFilter):
    "Compresses the server's output using the gzip compression algorithm"
    cacheFolder = None
    staticLevel = 9
    dynamicLevel = 3

    @staticmethod
    def compress(input, output, level):
        zfile = gzip.GzipFile(mode='wb', fileobj=output, compresslevel=level)
        zfile.write(input)
        zfile.close()

    @staticmethod
    def apply(context, item, registration, **kwargs):
        if Gzip.cacheFolder is None:
            config = Gzip.loadConfig()
            Gzip.cacheFolder = config['cache']
            Gzip.staticLevel = int(config['static_compress_level'])
            Gzip.dynamicLevel = int(config['dynamic_compress_level'])

        context.response.set_header('Content-Encoding', 'gzip')
        isStatic = (registration is not None and registration.type == 0)

        if isStatic:
            filename = registration.context
            modified = hex(os.stat(filename)[8])[2:]

            compfn = filename.replace(os.path.sep, '_')
            if os.name == 'nt':
                compfn = compfn.replace(os.path.altsep, '_').replace(':', '')

            glob_f = Gzip.cacheFolder + '/' + compfn
            compfn = glob_f + '#' + modified + '.gzip'

            if not(os.path.exists(compfn)):
                # remove old compressed files
                oldfiles = glob.glob(glob_f + '*.gzip')
                [os.remove(old) for old in oldfiles]

                output = io.FileIO(compfn, 'wb')
                Gzip.compress(context.response._get_body(),
                              output,
                              Gzip.staticLevel)
                output.close()

            context.response.clear()
            cache_file = io.FileIO(compfn)
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
    Compresses JavaScript files using JSMin
    http://www.crockford.com/javascript/jsmin.html
    """
    cacheFolder = None

    @staticmethod
    def compress(input, output):
        input.seek(0)
        jsmin = JavascriptMinify()
        jsmin.minify(input, output)

    @staticmethod
    def apply(context, item, registration, **kwargs):
        if JSMin.cacheFolder is None:
            config = JSMin.loadConfig()
            JSMin.cacheFolder = config['cache']

        is_static = (registration is not None and registration.type == 0)

        if is_static:
            filename = registration.context
            modified = hex(os.stat(filename)[8])[2:]

            compfn = filename.replace(os.path.sep, '_')
            if os.name == 'nt':
                compfn = compfn.replace(os.path.altsep, '_').replace(':', '')

            glob_f = JSMin.cacheFolder + '/' + compfn
            compfn = glob_f + '#' + modified + '.jsmin'

            if not(os.path.exists(compfn)):
                # remove old compressed files
                oldfiles = glob.glob(glob_f + '*.jsmin')
                [os.remove(old) for old in oldfiles]

                output = io.BytesIO()
                JSMin.compress(context.response._body, output)

                context.response._body = output

                cache_file = open(compfn, 'wb')
                cache_file.write(output.getvalue())
                cache_file.close()
            else:
                cache_file = open(compfn, 'rb')
                context.response.clear()
                context.response.write(cache_file.read())
                cache_file.close()

        else:
            output = io.BytesIO()
            JSMin.compress(context.response._body, output)
            context.response._body = ouput
