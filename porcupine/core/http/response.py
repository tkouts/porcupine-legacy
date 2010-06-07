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
"Porcupine HTTP response class"
try:
    # python 2.6
    import Cookie as cookies
except ImportError:
    # python 3
    import http.cookies as cookies

import io
import time
import mimetypes

from porcupine import exceptions
from porcupine.core.compat import str


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
        self.cookies = cookies.SimpleCookie()
        self.content_type = 'text/html'
        self.charset = 'utf-8'
        self._body = io.BytesIO()
        self._code = 200

    def _reset(self):
        self.__headers = {}
        self.clear()

    def _get_headers(self):
        ct = self.content_type
        if ct:
            if self.charset and ct[0:4] == 'text':
                ct += '; charset=' + self.charset
            self.__headers['Content-Type'] = ct
        return self.__headers

    def _get_body(self):
        body = self._body.getvalue()
        self._body.close()
        return body

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

    def clear(self):
        "Clears the response body."
        self._body.close()
        self._body = io.BytesIO()

    def set_header(self, header, value):
        """Sets a response HTTP header.

        @param header: HTTP header name e.g. 'Content-Type'
        @type header: str
        @param value: HTTP header value e.g. 'text/xml'
        @type value: str

        @return: None
        """
        if type(value) == str:
            value = value.encode('utf-8')
        self.__headers[header] = value

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
        if isinstance(s, str):
            self._body.write(s.encode(self.charset))
        elif isinstance(s, bytes):
            self._body.write(s)
        else:
            self._body.write(str(s))

    def end(self):
        """Terminates the response processing cycle
        and sends the response written so far to the client."""
        raise exceptions.ResponseEnd

    def write_file(self, filename, bytestream, is_attachment=True):
        """Writes a file stream to the response using a specified
        filename.

        @param filename: file name
        @type filename: str
        @param bytestream: file stream
        @type bytestream: str
        @param is_attachment: If C{True} then the file is sent
                              as an attachment.
        @type is_attachment: bool

        @return: None
        """
        if is_attachment:
            prefix = 'attachment;'
        else:
            prefix = ''
        content_disposition = '%sfilename="%s"' % (prefix, filename)
        self.content_type = mimetypes.guess_type(filename, False)[0]\
                            or 'text/plain'
        self.set_header('Content-Disposition', content_disposition)
        self.clear()
        self.write(bytestream)

    def load_from_file(self, filename):
        """Loads the response body from a file that resides on the file
        system and sets the 'Content-Type' header accordingly.

        @param filename: path of the file to be loaded
        @type filename: str

        @return: None
        """
        try:
            f = open(filename, 'rb')
        except IOError:
            raise exceptions.NotFound(
                'The file "%s" can not be found' % filename)

        self.content_type = mimetypes.guess_type(filename, False)[0] or \
                            'text/plain'
        self._body.truncate(0)
        self._body.write(f.read())
        f.close()
