#===============================================================================
#    Copyright 2005-2009 Tassos Koutsovassilis
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
"Porcupine HTTP response class"

import Cookie
import time
import mimetypes
import cStringIO

from porcupine import exceptions
from porcupine.core.decorators import deprecated

class HttpResponse(object):
    """Base response class

    @ivar content_type: Sets the content type of the response
    @type content_type: str
    
    @ivar charset: Sets the response's character encoding
    @type charset: str

    @ivar cookies: Using this variable you can set cookies
                   to be accepted by the client (if they are allowed)
    @type cookies: Cookie.SimpleCookie
    """
    def __init__(self):
        self.__headers = {}
        self.cookies = Cookie.SimpleCookie()
        self.content_type = 'text/html'
        self.charset = 'utf-8'
        self._body = cStringIO.StringIO()
        self._code = 200
    
    def _reset(self):
        self.__headers = {}
        self.clear()
        
    def _get_headers(self):
        ct = self.content_type
        if ct:
            if self.charset and ct[0:4]=='text':
                ct += '; charset=' +  self.charset
            self.__headers['Content-Type'] = ct
        return self.__headers
    
    def _get_body(self):
        body = self._body.getvalue()
        self._body.close()
        return(body)
        
    def set_expiration(self, seconds, cache_type='private'):
        """The response becomes valid for a certain amount of time
        expressed in seconds. The response is cached and reused for x seconds
        without server roundtripping.
        
        @param seconds: number of seconds
        @type seconds: int
            
        @return: None
        """
        self.__headers['Cache-Control'] = 'max-age=%d,%s' % (seconds,
                                                             cache_type)
        self.__headers['Expires'] = time.strftime(
            "%a, %d %b %Y %H:%M:%S GMT",
            time.gmtime(time.time() + seconds))
    setExpiration = deprecated(set_expiration)
        
    def clear(self):
        "Clears the response body."
        self._body.truncate(0)
        #self._body.seek(0)
        
    def set_header(self, header, value):
        """Sets a response HTTP header.

        @param header: HTTP header name e.g. 'Content-Type'
        @type header: str
        @param value: HTTP header value e.g. 'text/xml'
        @type value: str
        
        @return: None
        """
        self.__headers[header] = value
    setHeader = deprecated(set_header)
        
    def redirect(self, location):
        """Causes the client to redirect to a specified location.
        Relative redirects are not safe.

        @param location: redirect location
        @type location: str
        
        @return: None
        """
        self._code = 302
        self.__headers["Location"] = location
        raise exceptions.ResponseEnd

    def internal_redirect(self, location):
        """Internal server transfer
        
        @param location: internal relative location
        @type location: str
        
        @return: None
        """
        raise exceptions.InternalRedirect(location)

    def write(self, s):
        """Appends a string to the response sent to the client.
        
        @param s: string to write
        @type s: str
        
        @return: None
        """
        self._body.write(str(s))

    def end(self):
        """Terminates the response processing cycle
        and sends the response written so far to the client."""
        raise exceptions.ResponseEnd

    def write_file(self, sFilename, sStream, isAttachment=True):
        """Writes a file stream to the response using a specified
        filename.

        @param sFilename: file name
        @type sFilename: str
        @param sStream: file stream
        @type sStream: str
        @param isAttachment: If C{True} then the file is sent as an attachment.
        @type isAttachment: bool

        @return: None
        """
        if isAttachment:
            sPrefix = 'attachment;'
        else:
            sPrefix = ''
        self.content_type = mimetypes.guess_type(sFilename, False)[0]\
                            or 'text/plain'
        self.set_header('Content-Disposition',
                        '%sfilename="%s"' % (sPrefix, sFilename))
        self.clear()
        self.write(sStream)
    writeFile = deprecated(write_file)

    def load_from_file(self, fileName):
        """Loads the response body from a file that resides on the file
        system and sets the 'Content-Type' header accordingly.
        
        @param fileName: path of the file to be loaded
        @type fileName: str
        
        @return: None
        """
        try:
            oFile = file(fileName, 'rb')
        except IOError:
            raise exceptions.NotFound(
                'The file "%s" can not be found' % fileName)
        
        self.content_type = mimetypes.guess_type(fileName, False)[0] or 'text/plain'
        self._body.truncate(0)
        self._body.write(oFile.read())
        oFile.close()
    loadFromFile = deprecated(load_from_file)
