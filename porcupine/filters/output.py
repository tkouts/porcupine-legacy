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
"""
Porcupine output filters
"""
import os
import os.path
import glob
import gzip
import cStringIO
import re

from porcupine.filters.filter import PostProcessFilter
from porcupine.utils import misc

class Gzip(PostProcessFilter):
    "Compresses the server's output using the gzip compression algorithm"
    cacheFolder = None
    staticLevel = 9
    dynamicLevel = 3
    
    @staticmethod
    def compress(zbuf, stream, level):
        zfile = gzip.GzipFile(mode='wb', fileobj = zbuf, compresslevel = level)
        zfile.write(stream)
        zfile.close()

    @staticmethod
    def apply(context, item, registration, **kwargs):
        if Gzip.cacheFolder == None:
            config = Gzip.loadConfig()
            Gzip.cacheFolder = config['cache']
            Gzip.staticLevel = int(config['static_compress_level'])
            Gzip.dynamicLevel = int(config['dynamic_compress_level'])
        
        context.response.set_header('Content-Encoding', 'gzip')
        isStatic = (registration != None and registration.type == 0)
                
        if isStatic:
            fileName = registration.context
            sMod = hex(os.stat(fileName)[8])[2:]
            
            compfn = fileName.replace(os.path.sep, '_')
            if os.name == 'nt':
                compfn = compfn.replace(os.path.altsep, '_').replace(':', '')
            
            glob_f = Gzip.cacheFolder + '/' + compfn
            compfn = glob_f + '#' + sMod + '.gzip'

            if not(os.path.exists(compfn)):
                # remove old compressed files
                oldFiles = glob.glob(glob_f + '*.gzip')
                res = [os.remove(oldFile) for oldFile in oldFiles]

                zBuf = cStringIO.StringIO()
                Gzip.compress(zBuf, context.response._get_body(), Gzip.staticLevel)

                context.response._body = zBuf

                cache_file = file(compfn, 'wb')
                cache_file.write(zBuf.getvalue())
                
                cache_file.close()
            else:
                cache_file = file(compfn, 'rb')
                context.response.clear()
                context.response.write(cache_file.read())
                cache_file.close()
                
        else:
            zBuf = cStringIO.StringIO()
            Gzip.compress(zBuf, context.response._get_body(), Gzip.dynamicLevel)
            context.response._body = zBuf

class I18n(PostProcessFilter):
    _tokens = re.compile('(@@([\w\.]+)@@)', re.DOTALL)
    """
    Internationalization filter based on the browser's
    preferred language setting.
    """
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
                res = bundle.getResource(key, language)
                if res != key:
                    break
            output = output.replace(token, res)
        context.response.clear()
        context.response.write(output)
