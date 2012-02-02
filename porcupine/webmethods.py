#==============================================================================
#   Copyright (c) 2005-2011, Tassos Koutsovassilis
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
Porcupine web method decorators.
This kind of method becomes directly accessible over HTTP.
"""
from porcupine import exceptions
from porcupine.core.decorators import WebMethodDescriptor
from porcupine.core.rpc import xmlrpc, jsonrpc
from porcupine.utils import misc


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


def quixui(of_type, isPage=False, title='Untitled', bgcolor='white',
           lang='', qs='', body='',
           max_age=0, encoding='utf-8',
           template=None, template_engine='string_template'):

    class WebMethod(WebMethodDescriptor):
        def __init__(self, function):
            WebMethodDescriptor.__init__(self, function, of_type,
                ('GET',
                 '(MSIE (?:[6-9]|10).+Windows NT)|' +
                 '(Mozilla/5\.0.+rv:(1\.[7-9]|2\.\d|(?:[5-9]|1[0-9])\.\d))|' +
                 'Version/[3-5]\.\d(.*)Safari|' +
                 'Chrome/(\d)+\.(\d)+|' +
                 'Opera/9',
                 lang,
                 qs),
                'text/xml', encoding, max_age, template, template_engine)

        def execute(self, item, context):
            if isPage:
                from porcupine.core.session import SessionManager

                script_name = context.request.serverVariables["SCRIPT_NAME"]
                cookies_required = SessionManager._sm.requires_cookies
                no_cookies_url = '%s/{%s}%s%s' % (
                    script_name,
                    context.session.sessionid,
                    context.request.serverVariables['PATH_INFO'],
                    context.request.get_query_string())

                # get revision of quix core files
                core_revision = misc.get_revision('quix', 'core.js')

                vars = (bgcolor,
                        title,
                        script_name,
                        core_revision,
                        context.request.get_lang(),
                        str(cookies_required).lower(),
                        no_cookies_url)

                context.response.content_type = 'text/html'
                context.response.write(('''
<!DOCTYPE html>
<html style="background-color:%s">
    <head>
        <title>%s</title>
        <script type="text/javascript" defer="defer"
            src="%s/quix/core.js?r=%d">
        </script>
        <script type="text/javascript">
            (function() {
                navigator.locale = '%s';
                document.cookiesEnabled = false;
                document.cookiesRequired = %s;
                var session_id = (
                    new RegExp("/\(?:{|%%7b)(.*?)\(?:}|%%7d)", "i"))
                    .exec(document.location.href);
                if (session_id) {
                    session_id = session_id[1];
                }
                if (typeof document.cookie == "string" &&
                        document.cookie.length != 0) {
                    document.cookiesEnabled = true;
                }
                if (!session_id && !document.cookiesEnabled) {
                    document.location.href = '%s';
                }
            })();
        </script>
        <script id="quix" type="application/xml">''' % vars).strip())

            WebMethodDescriptor.execute(self, item, context)

            if isPage:
                context.response.write('''</script>
    </head>
    <body onload="QuiX.__init__('quix')">''')
                context.response.write(body)
                context.response.write('</body></html>')

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


def remotemethod(of_type, client='', lang='', qs='', encoding='utf-8',
                 allowed_origins=None):

    class WebMethod(WebMethodDescriptor):
        def __init__(self, function):
            WebMethodDescriptor.__init__(self, function, of_type,
                                         ('POST', client, lang, qs),
                                         'application/json', encoding, None,
                                         None, None)
            if allowed_origins:
                from porcupine import context
                from porcupine import filters

                @filters.runas('system')
                @webmethod(of_type=of_type,
                           http_method="OPTIONS",
                           content_type="text/plain",
                           max_age=-1)
                def __blank__(self):
                    origin = WebMethod._getAccessControlAllowOrigin(
                        allowed_origins, context)
                    if origin:
                        allowheaders = (context.request.
                                        HTTP_ACCESS_CONTROL_REQUEST_HEADERS)
                        if not allowheaders:
                            allowheaders = "*"
                        context.response.set_header(
                            "Access-Control-Allow-Origin", origin)
                        context.response.set_header(
                            "Access-Control-Allow-Headers", allowheaders)
                        context.response.set_header(
                            "Access-Control-Allow-Methods",
                            "POST, GET, OPTIONS")
                        context.response.set_header(
                            "Cache-Control", "no-cache")

        @staticmethod
        def _getAccessControlAllowOrigin(allowed_origins, context):
            origin = context.request.HTTP_ORIGIN
            if origin:
                if "*" in allowed_origins:
                    if origin == "null":
                        return "*"
                    return origin
                if origin in allowed_origins:
                    if origin == "null":
                        return "*"
                    return origin
            return None

        def execute(self, item, context):
            if allowed_origins:
                origin = WebMethod._getAccessControlAllowOrigin(
                    allowed_origins,
                    context)
                if origin:
                    context.response.set_header("Access-Control-Allow-Origin",
                                                origin)
                elif context.request.HTTP_ORIGIN:
                    return

            if context.request.type == 'xmlrpc':
                rpc = xmlrpc
                rq_body = context.request.input
                context.response.content_type = 'application/xml'
            elif context.request.type == 'jsonrpc':
                rpc = jsonrpc
                rq_body = context.request.input.decode(context.request.charset)

            context.request.id, args = rpc.loads(rq_body)

            # execute method
            v = self.func(item, *args)

            if v is not None:
                context.response.write(
                    rpc.dumps(context.request.id, v, self.encoding))
                return v
            else:
                raise exceptions.InternalServerError(
                    'Remote method "%s" returns no value' %
                    context.request.method)

    return WebMethod
