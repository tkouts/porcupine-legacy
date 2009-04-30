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
Porcupine web method decorators.
This kind of method becomes directly accessible over HTTP.
"""
from porcupine import exceptions
from porcupine.core.decorators import WebMethodDescriptor
from porcupine.core import xmlrpc

def webmethod(of_type, http_method='GET', client='', lang='', qs='',
              max_age=0, content_type='text/html', encoding='utf-8',
              template=None, template_engine='string_template'):
    class WebMethod(WebMethodDescriptor):
        def __init__(self, function):
            WebMethodDescriptor.__init__(self, function, of_type,
                                         (http_method, client, lang, qs),
                                         content_type, encoding, max_age,
                                         template, template_engine)
    return WebMethod

def quixui(of_type, isPage=False, lang='', qs='',
           max_age=0, encoding='utf-8',
           template=None, template_engine='string_template'):
    class WebMethod(WebMethodDescriptor):
        def __init__(self, function):
            WebMethodDescriptor.__init__(self, function, of_type,
                ('GET',
                 '(MSIE [6-8].+Windows NT)|(Mozilla/5.0.+rv:1.[7-9])|' +
                    'Version/[3-4].\d(.*)Safari|Chrome/\d.\d|Opera/9',
                 lang,
                 qs),
                'text/xml', encoding, max_age, template, template_engine)
            
        def execute(self, item, context):
            if isPage:
                script_name = context.request.serverVariables["SCRIPT_NAME"]
                no_cookies_url = '%s/{%s}%s%s' % (
                    script_name,
                    context.session.sessionid,
                    context.request.serverVariables['PATH_INFO'],
                    context.request.get_query_string()
                )
                vars = (script_name, no_cookies_url)
                
                context.response.content_type = 'text/html'
                context.response.write(('''
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd">
<html>
    <head>
        <script type="text/javascript" defer="defer" src="%s/__quix/quix.js"></script>
        <script type="text/javascript" defer="defer">
            var cookiesEnabled = false;
            var session_id = (new RegExp("/\(?:{|%%7b)(.*?)\(?:}|%%7d)", "i")).exec(document.location.href);
            if (session_id)
                session_id = session_id[1];
            if (typeof document.cookie == "string" && document.cookie.length != 0)
                cookiesEnabled = true;
            if (!session_id && !cookiesEnabled)
                document.location.href = '%s';
        </script>
    </head>
    <body onload="QuiX.__init__()">
        <xml id="quix" style="display:none">''' % vars).strip())
            WebMethodDescriptor.execute(self, item, context)
            if isPage:
                context.response.write('</xml></body></html>')
    return WebMethod

def mobileui(of_type, lang='', qs='',
             max_age=0, encoding='utf-8',
             template=None, template_engine='string_template'):
    class WebMethod(WebMethodDescriptor):
        def __init__(self, function):
            WebMethodDescriptor.__init__(self, function, of_type,
                ('GET', 'PMB|UNTRUSTED', lang, qs),
                'text/xml', encoding, max_age, template, template_engine)
    return WebMethod

def remotemethod(of_type, client='', lang='', qs='', encoding='utf-8'):
    class WebMethod(WebMethodDescriptor):
        def __init__(self, function):
            WebMethodDescriptor.__init__(self, function, of_type,
                                         ('POST', client, lang, qs),
                                         'text/xml', encoding, None,
                                         None, None)
            
        def execute(self, item, context):
            args = xmlrpc.XMLRPCParams()
            args.loadXML(context.request.input.getvalue())
            v = self.func(item, *args)
            
            if v is not None:
                response = xmlrpc.XMLRPCParams((v,))
                context.response.write(
                    '<?xml version="1.0"?><methodResponse>%s</methodResponse>' %
                    response.serialize())
                return v
            else:
                raise exceptions.InternalServerError, \
                    'Remote method "%s" returns no value' % context.request.method
    return WebMethod
