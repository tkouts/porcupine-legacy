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
"Porcupine Server Exception classes"
import logging
import sys
import traceback

from porcupine.utils import xml

class ConfigurationError(Exception):
    pass

class ResponseEnd(Exception):
    pass

class InternalRedirect(Exception):
    pass

class PorcupineException(Exception):
    def __init__(self, info='', outputTraceback=False):
        self.code = 0
        self.severity = 0
        self.outputTraceback = outputTraceback
        self.info = info

    def emit(self, context=None, item=None):
        from porcupine.core.runtime import logger
        logger.log(
            self.severity,
            self.description,
            exc_info=self.outputTraceback
        )
        if context != None:
            context.response._reset()
            context.response._code = self.code
            context.response.set_header('Cache-Control', 'no-cache')
            code = self.code
            description = self.description
            request_type = context.request.type
            
            if request_type == 'xmlrpc':
                context.response.content_type = 'text/xml'
                error_template = 'conf/XMLRPCError.xml'
            else:
                context.response.content_type = 'text/html'
                error_template = 'conf/errorpage.html'
                    
            http_method = context.request.REQUEST_METHOD
            browser = context.request.HTTP_USER_AGENT
            lang = context.request.HTTP_ACCEPT_LANGUAGE
            method = context.request.method
            
            if item != None:
                contentclass = item.contentclass
            else:
                contentclass = '-'
        
            if self.outputTraceback:
                tbk = traceback.format_exception(*sys.exc_info())
                tbk = '\n'.join(tbk)
                if request_type == 'xmlrpc':
                    tbk = xml.xml_encode(tbk)
                info = tbk
            else:
                info = self
            
            file = open(error_template)
            body = file.read()
            file.close()
            context.response.write(body % vars())
        
    def __str__(self):
        return self.info

# server exceptions
class InternalServerError(PorcupineException):
    def __init__(self, info='', outputTraceback=True):
        PorcupineException.__init__(self, info, outputTraceback)
        self.code = 500
        self.description = 'Internal Server Error'
        self.severity = logging.ERROR
        
class NotImplemented(InternalServerError):
    def __init__(self, info=''):
        InternalServerError.__init__(self, info)
        self.code = 501
        self.description = 'Not Implemented'
        self.severity = logging.WARNING
        
class ContainmentError(InternalServerError):
    def __init__(self, info=''):
        InternalServerError.__init__(self, info, False)
        self.description = 'Containment Error'
        self.severity = logging.WARNING
        
class ReferentialIntegrityError(InternalServerError):
    def __init__(self, info=''):
        InternalServerError.__init__(self, info, False)
        self.severity = logging.WARNING
        
class NotFound(PorcupineException):
    def __init__(self, info='', outputTraceback=True):
        PorcupineException.__init__(self, info, outputTraceback)
        self.code = 404
        self.description = 'Not Found'
        self.severity = logging.INFO
        
class ObjectNotFound(NotFound):
    pass

class PermissionDenied(PorcupineException):
    def __init__(self, info=''):
        PorcupineException.__init__(self, info)
        self.code = 403
        self.description = 'Forbidden'

class DBTransactionIncomplete(InternalServerError):
    def __init__(self):
        InternalServerError.__init__(self,
            'Exceeded maximum retries for transcation.')
        self.severity = logging.CRITICAL
