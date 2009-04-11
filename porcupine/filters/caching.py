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
Porcupine HTTP caching filters
"""
from porcupine.filters.filter import PreProcessFilter

class ETag(PreProcessFilter):
    @staticmethod
    def generate_item_etag(context, item, registration):
        if item != None:
            return '%s%s' % (context.user._id, item.modified)
    
    @staticmethod
    def apply(context, item, registration, **kwargs):
        etag = kwargs['generator'](context, item, registration)
        if etag:
            response = context.response
            if_none_match = context.request.HTTP_IF_NONE_MATCH
            if if_none_match != None and if_none_match == '"%s"' % etag:
                response._code = 304
                response.end()
            else: 
                response.set_header('ETag', '"%s"' % etag)
