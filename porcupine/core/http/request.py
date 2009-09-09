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
"Request classes"

import re
import io
from cgi import FieldStorage

try:
    # python 2.6
    import Cookie as cookies
except ImportError:
    # python 3
    import http.cookies as cookies

try:
    # python 2.6
    import urlparse
except ImportError:
    # python 3
    import urllib.parse as urlparse

from porcupine.core.compat import str
from porcupine.core.decorators import deprecated

class HttpRequest(object):
    """Http request class
    @ivar serverVariables: The request environment
    @type serverVariables: dict
    
    @ivar queryString: The query string parameters as lists.
    @type queryString: dict

    @ivar cookies: Contains the cookies sent by the client
    @type cookies: Cookie.SimpleCookie
    
    @ivar input: The raw request input
    @type input: bytes

    @ivar interface: The request's interface, i.e. 'CGI', 'MOD_PYTHON', 'WSGI'
    @type interface: str

    @ivar charset: The request's body charset
    @type charset: str

    @ivar form: If the request method is POST, this attribute holds the posted
                values.
    @type form: dict
    """
    _charset_detect = re.compile('charset=([\w-]+)')
    _xml_rpc_detect = re.compile(b'<methodName>(.*?)</methodName>')
    _json_rpc_detect = re.compile(
        b'jsonrpc.+[\'"]method[\'"]\s*:\s*[\'"](.*?)[\'"]')

    def __init__(self, raw_request):
        self.serverVariables = raw_request['env']
        self.serverVariables.setdefault('HTTP_ACCEPT_LANGUAGE', '')
        self.serverVariables.setdefault('HTTP_USER_AGENT', '')
        
        path_info = self.serverVariables.get('PATH_INFO', '/')
        if type(path_info) == str:
            # python 3: convert to bytes
            path_info = path_info.encode('latin-1')
        # decode utf-8 encoded path_info
        self.serverVariables['PATH_INFO'] = path_info.decode('utf-8')

        query_string = self.serverVariables.setdefault('QUERY_STRING', '')
        if type(query_string) == bytes:
            # python 2.6: convert to unicode
            query_string = query_string.decode('latin-1')
        self.queryString = urlparse.parse_qs(query_string)

        self.cookies = cookies.SimpleCookie()
        if 'HTTP_COOKIE' in self.serverVariables:
            self.cookies.load(self.serverVariables['HTTP_COOKIE'])

        self.input = raw_request['inp']
        self.interface = raw_request['if']
        self.charset = None

        self.method = self.queryString.get('cmd', [''])[0]
        self.form = None
        # required by some rpc protocols such as json-rpc 2.0
        self.id = None

        self.type = 'http'
        if self.serverVariables['REQUEST_METHOD'] == 'POST':
            # detect charset
            charset_match = re.search(self._charset_detect,
                                      self.serverVariables['CONTENT_TYPE'])
            if charset_match:
                self.charset = charset_match.groups()[0]
            else:
                # TODO: sniff charset?
                self.charset = 'utf-8'

            if self.serverVariables['CONTENT_TYPE'][:8] == 'text/xml':
                # xmlrpc request?
                method_match = re.search(self._xml_rpc_detect,
                                         self.input)
                if method_match:
                    self.method = method_match.groups()[0].decode(self.charset)
                    self.type = 'xmlrpc'
            elif self.serverVariables['CONTENT_TYPE'][:16] == 'application/json':
                # jsonrpc request?
                method_match = re.search(self._json_rpc_detect,
                                         self.input)
                if method_match:
                    self.method = method_match.groups()[0].decode(self.charset)
                    self.type = 'jsonrpc'
            else:
                # http form post
                self.form = FieldStorage(fp=io.BytesIO(self.input),
                                         environ=self.serverVariables)

    def get_lang(self):
        """Returns the preferred language of the client.
        If the client has multiple languages selected, the first is returned.
        
        @rtype: str
        """
        return(self.serverVariables['HTTP_ACCEPT_LANGUAGE'].split(',')[0])
    getLang = deprecated(get_lang)
        
    def get_host(self):
        """Returns the name of the host.
        
        @rtype: str
        """
        return(self.serverVariables["HTTP_HOST"])
    getHost = deprecated(get_host)

    def get_query_string(self):
        """Returns the full query string, including the '?'.
        
        @rtype: str
        """
        if self.serverVariables['QUERY_STRING']:
            return '?' + self.serverVariables['QUERY_STRING']
        else:
            return ''
    getQueryString = deprecated(get_query_string)
        
    def get_protocol(self):
        """Returns the request's protocol (http or https).
        
        @rtype: str
        """
        sProtocol = 'http'
        if self.serverVariables.setdefault('HTTPS', 'off') == 'on':
            sProtocol += 's'
        return sProtocol
    getProtocol = deprecated(get_protocol)

    def get_root_url(self):
        """Returns the site's root URL including the executing script.
        For instance, C{http://server/porcupine.py}
        
        @rtype: str
        """
        return (self.get_protocol() + '://'
                + self.serverVariables['HTTP_HOST']
                + self.serverVariables['SCRIPT_NAME'])
    getRootUrl = deprecated(get_root_url)
        
    def __getattr__(self, name):
        try:
            return self.serverVariables[name]
        except KeyError:
            return None
