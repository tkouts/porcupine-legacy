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
"""
Porcupine web method decorators.
This kind of method becomes directly accessible over HTTP.
"""
from porcupine import exceptions
from porcupine.config import pubdirs
from porcupine.core.decorators import WebMethodDescriptor
from porcupine.core.rpc import xmlrpc, jsonrpc


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


def quixui(of_type, isPage=False, title='Untitled', lang='', qs='',
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
                from porcupine.core.session import SessionManager
                from porcupine.filters.output import JSMerge

                script_name = context.request.serverVariables["SCRIPT_NAME"]
                cookies_required = SessionManager._sm.requires_cookies
                no_cookies_url = '%s/{%s}%s%s' % (
                    script_name,
                    context.session.sessionid,
                    context.request.serverVariables['PATH_INFO'],
                    context.request.get_query_string())

                # get revision of quix core files
                quix_core_reg = (
                    pubdirs.dirs['__quix'].get_registration('core.js'))
                quix_core_files = (
                    quix_core_reg.get_filter_by_type(JSMerge)[1]['files'].
                    split(','))
                core_revision = JSMerge.get_revision(quix_core_files)

                vars = (title, script_name, script_name, core_revision,
                        str(cookies_required).lower(), no_cookies_url)
                context.response.content_type = 'text/html'
                context.response.write(('''
<!DOCTYPE html>
<html>
    <head>
        <title>%s</title>
        <script type="text/javascript" defer="defer"
            src="%s/__quix/lib/extensions.js">
        </script>
        <script type="text/javascript" defer="defer"
            src="%s/__quix/core.js?r=%d">
        </script>
        <script type="text/javascript">
            (function() {
                document.cookiesEnabled = false;
                document.cookiesRequired = %s;
                var session_id = (
                    new RegExp("/\(?:{|%%7b)(.*?)\(?:}|%%7d)", "i"))
                    .exec(document.location.href);
                if (session_id)
                    session_id = session_id[1];
                if (typeof document.cookie == "string" &&
                        document.cookie.length != 0)
                    document.cookiesEnabled = true;
                if (!session_id && !document.cookiesEnabled)
                    document.location.href = '%s';
                })();
        </script>
    </head>
    <body onload="QuiX.__init__('quix')">
        <textarea id="quix" style="display:none">''' % vars).strip())

            WebMethodDescriptor.execute(self, item, context)

            if isPage:
                context.response.write('</textarea></body></html>')

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
                                         'application/json', encoding, None,
                                         None, None)

        def execute(self, item, context):
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
