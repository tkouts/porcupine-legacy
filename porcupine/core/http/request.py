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
import Cookie
import cStringIO
from cgi import parse_qs
from cgi import FieldStorage
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
    @type input: StringIO

    @ivar interface: The request's interface, i.e. 'CGI' or 'MOD_PYTHON' or 'WSGI'
    @type interface: str
    
    @ivar form: If the request method is POST, this attribute holds the posted
                values.
    @type form: dict
    """
    _xml_rpc_detect = re.compile('<methodName>(.*?)</methodName>')

    def __init__(self, rawRequest):
        self.serverVariables = rawRequest['env']
        
        #print self.serverVariables
        
        self.serverVariables.setdefault('HTTP_ACCEPT_LANGUAGE', '')
        self.serverVariables.setdefault('HTTP_USER_AGENT', '')
        self.serverVariables.setdefault('PATH_INFO', '/')
        
        if self.serverVariables.setdefault('QUERY_STRING', ''):
            self.queryString = parse_qs(self.serverVariables['QUERY_STRING'])
        else:
            self.queryString = {}
        
        self.cookies = Cookie.SimpleCookie()
        if self.serverVariables.has_key('HTTP_COOKIE'):
            self.cookies.load(self.serverVariables['HTTP_COOKIE'])
        
        self.input = cStringIO.StringIO(rawRequest['inp'])
        self.interface = rawRequest['if']
        
        self.method = self.queryString.get('cmd', [''])[0]
        self.form = None
        self.type = 'http'
        
        if self.serverVariables['REQUEST_METHOD'] == 'POST':
            if self.serverVariables['CONTENT_TYPE'][:8] == 'text/xml':
                # xmlrpc request?
                method_match = re.search(self._xml_rpc_detect,
                                         self.input.getvalue())
                if method_match:
                    self.method = method_match.groups()[0]
                    self.type = 'xmlrpc'
            else:
                # http form post
                self.form = FieldStorage(fp=self.input, environ=self.serverVariables)
        
        
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
