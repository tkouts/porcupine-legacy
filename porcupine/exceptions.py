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

from string import Template

class ConfigurationError(Exception):
    pass

class ResponseEnd(Exception):
    pass

class InternalRedirect(Exception):
    pass

class DBRetryTransaction(Exception):
    pass

class DBReadOnly(Exception):
    pass

class PorcupineException(Exception):
    """Base class of all server related exceptions"""
    code = 0
    rpc_code = -32603
    severity = 0
    description = ''
    output_traceback = False
    
    def __init__(self, info=''):
        self.info = info

    def emit(self, context=None, item=None):
        from porcupine.core.runtime import logger
        logger.log(self.severity, self.description, exc_info=True)
        if context is not None:
            context.response._reset()
            context.response._code = self.code
            context.response.set_header('Cache-Control', 'no-cache')
            code = self.code
            description = self.description
            request_type = context.request.type
        
            if self.output_traceback:
                tbk = traceback.format_exception(*sys.exc_info())
                tbk = '\n'.join(tbk)
                info = tbk
            else:
                info = self.info

            if request_type == 'xmlrpc':
                from porcupine.core.rpc import xmlrpc
                context.response.content_type = 'text/xml'
                context.response.write(xmlrpc.error(self.rpc_code,
                                                    description, info))
            elif request_type == 'jsonrpc':
                from porcupine.core.rpc import jsonrpc
                context.response.content_type = 'application/json'
                context.response.write(jsonrpc.error(self.rpc_code, description,
                                                     info, context.request.id))
            else:
                http_method = context.request.REQUEST_METHOD
                browser = context.request.HTTP_USER_AGENT
                lang = context.request.HTTP_ACCEPT_LANGUAGE
                method = context.request.method

                if item is not None:
                    contentclass = item.contentclass
                else:
                    contentclass = '-'

                # write response
                context.response.content_type = 'text/html'
                f = open('conf/errorpage.html')
                try:
                    template = Template(f.read())
                    context.response.write(template.substitute(vars()))
                finally:
                    f.close()
        
    def __str__(self):
        return self.info

# server exceptions
class InternalServerError(PorcupineException):
    code = 500
    severity = logging.ERROR
    description = 'Internal Server Error'
    output_traceback = True

class ContainmentError(InternalServerError):
    severity = logging.WARNING
    output_traceback = False
        
class ReferentialIntegrityError(InternalServerError):
    severity = logging.WARNING
    output_traceback = False

class OQLError(InternalServerError):
    output_traceback = False

class DBDeadlockError(InternalServerError):
    severity = logging.CRITICAL
    output_traceback = False
    
    def __init__(self):
        InternalServerError.__init__(self,
            'Exceeded maximum retries for transcation.')

class NotImplemented(PorcupineException):
    code = 501
    severity = logging.WARNING
    description = 'Not Implemented'

class NotFound(PorcupineException):
    code = 404
    severity = logging.INFO
    description = 'Not Found'
        
class ObjectNotFound(NotFound):
    description = 'Object Not Found'

class PermissionDenied(PorcupineException):
    code = 403
    description = 'Forbidden'

# rpc exceptions
class RPCParseError(InternalServerError):
    rpc_code = -32700
    description = 'Parse Error'

class RPCInvalidRequestError(InternalServerError):
    rpc_code = -32600
    description = 'Invalid Request'

class RPCMethodNotFound(NotFound):
    rpc_code = -32601
    description = 'Method Not Found'

class RPCInvalidParams(InternalServerError):
    rpc_code = -32602
    description = 'Invalid Params'
