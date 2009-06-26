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
"Porcupine Server Thread"
import re
import hashlib
from cPickle import loads

from porcupine import context
from porcupine import exceptions
from porcupine.utils import misc
from porcupine.db import _db

from porcupine.config import pubdirs
from porcupine.config.settings import settings

from porcupine.core.http.request import HttpRequest
from porcupine.core.http.response import HttpResponse
from porcupine.core.http import ServerPage
from porcupine.core.session import SessionManager
from porcupine.core.servicetypes.asyncserver import BaseServerThread

class PorcupineThread(BaseServerThread):
    _sid_pattern = re.compile('/\{(.*?)\}')
    _method_cache = {}

    def handle_request(self, rh, raw_request=None):
        if raw_request == None:
            raw_request = loads(rh.input_buffer)
        response = context.response = HttpResponse()
        request = context.request = HttpRequest(raw_request)
                
        item = None
        registration = None

        # get sessionid
        session_id = None
        cookies_enabled = True
        path_info = request.serverVariables['PATH_INFO']
        
        # detect if sessionid is injected in the URL
        session_match = re.match(self._sid_pattern, path_info)
        if session_match:
            path_info = path_info.replace(session_match.group(), '', 1) or '/'
            request.serverVariables['PATH_INFO'] = path_info
            session_id = session_match.group(1)
            cookies_enabled = False
        # otherwise check cookie
        elif request.cookies.has_key('_sid'):
            session_id = request.cookies['_sid'].value
            cookies_enabled = True
        
        try:
            try:
                path_tokens = path_info.split('/')
                if len(path_tokens) > 1:
                    dir_name = path_tokens[1]
                    web_app = pubdirs.dirs.get(dir_name, None)
                else:
                    web_app = None
                if web_app == None:
                    # try to get the requested object from the db
                    item = _db.get_item(path_info)
                    if item != None and not item._isDeleted:
                        self._fetch_session(session_id, cookies_enabled)
                        self._dispatch_method(item)
                    else:
                        raise exceptions.NotFound, \
                            'The resource "%s" does not exist' % path_info
                else:
                    # request to a published directory
                    # remove blank entry & app name to get the requested path
                    dir_path = '/'.join(path_tokens[2:])
                    registration = web_app.getRegistration(
                        dir_path,
                        request.serverVariables['REQUEST_METHOD'],
                        request.serverVariables['HTTP_USER_AGENT'],
                        request.get_lang())
                    if not registration:
                        raise exceptions.NotFound, \
                            'The resource "%s" does not exist' % path_info
                    
                    rtype = registration.type
                    if rtype == 1: # in case of psp fetch session
                        self._fetch_session(session_id, cookies_enabled)

                    # apply pre-processing filters
                    [filter[0].apply(context, item, registration, **filter[1])
                     for filter in registration.filters
                     if filter[0].type == 'pre']

                    if rtype == 1: # psp page
                        ServerPage.execute(context, registration.context)
                    elif rtype == 0: # static file
                        f_name = registration.context
                        if_none_match = request.HTTP_IF_NONE_MATCH
                        if if_none_match != None and if_none_match == \
                                '"%s"' % misc.generate_file_etag(f_name):
                            response._code = 304
                        else: 
                            response.load_from_file(f_name)
                            response.set_header('ETag', '"%s"' %
                                               misc.generate_file_etag(f_name))
                            if registration.encoding:
                                response.charset = registration.encoding
            
            except exceptions.ResponseEnd, e:
                pass
            
            if registration != None and response._code == 200:
                # do we have caching directive?
                if registration.max_age:
                    response.set_expiration(registration.max_age)
                # apply post-processing filters
                [filter[0].apply(context, item, registration, **filter[1])
                 for filter in registration.filters
                 if filter[0].type == 'post']

        except exceptions.InternalRedirect, e:
            lstPathInfo = e.args[0].split('?')
            raw_request['env']['PATH_INFO'] = lstPathInfo[0]
            if len(lstPathInfo) == 2:
                raw_request['env']['QUERY_STRING'] = lstPathInfo[1]
            else:
                raw_request['env']['QUERY_STRING'] = ''
            self.handle_request(rh, raw_request)
            
        except exceptions.PorcupineException, e:
            e.emit(context, item)
                
        except:
            e = exceptions.InternalServerError()
            e.emit(context, item)

        settings['requestinterfaces'][request.interface](rh, response)

    def _dispatch_method(self, item):
        method_name = context.request.method or '__blank__'
        method = None
        
        # get request parameters
        r_http_method = context.request.serverVariables['REQUEST_METHOD']
        r_browser = context.request.serverVariables['HTTP_USER_AGENT']
        r_qs = context.request.serverVariables['QUERY_STRING']
        r_lang = context.request.get_lang()
        
        method_key = hashlib.md5(''.join((str(hash(item.__class__)),
                                 method_name, r_http_method,
                                 r_qs, r_browser, r_lang))).digest()
        
        method = self._method_cache.get(method_key, None)
        if method == None:
            candidate_methods = [meth for meth in dir(item)
                                 if meth[:4+len(method_name)] == \
                                 'WM_%s_' % method_name]
            
            candidate_methods.sort(
                cmp=lambda x,y:-cmp(
                    int(getattr(item,x).func_dict['cnd'][1]!='') +
                    int(getattr(item,x).func_dict['cnd'][3]!=''),
                    int(getattr(item,y).func_dict['cnd'][1]!='') +
                    int(getattr(item,y).func_dict['cnd'][3]!=''))
            )
            
            for method_name in candidate_methods:
                http_method, client, lang, qs = \
                    getattr(item, method_name).func_dict['cnd']
            
                if re.match(http_method, r_http_method) and \
                        re.search(qs, r_qs) and \
                        re.search(client, r_browser) and \
                        re.match(lang, r_lang):
                    method = method_name
                    break
        
            self._method_cache[method_key] = method
    
        if method == None:
            raise exceptions.NotImplemented, \
                'Unknown method call "%s"' % method_name
        else:
            # execute method
            getattr(item, method)(context)

    def _fetch_session(self, session_id, cookies_enabled):
        session = None
        if session_id:
            session = SessionManager.fetch_session(session_id)
        if session != None:
            context.session = session
            context.user = _db.get_item(context.session.userid)
            context.request.serverVariables["AUTH_USER"] = \
                context.user.displayName.value
            if not cookies_enabled:
                if not session.sessionid in self.request.SCRIPT_NAME:
                    context.request.serverVariables['SCRIPT_NAME'] += \
                        '/{%s}' % session.sessionid
                else:
                    lstScript = self.request.SCRIPT_NAME.split('/')
                    context.request.serverVariables['SCRIPT_NAME'] = \
                        '/%s/{%s}' %(lstScript[1], session.sessionid)
        else:
            # create guest session
            guest_id = settings['sessionmanager']['guest']
            context.user = _db.get_item(guest_id)
            new_session = SessionManager.create(guest_id)
            session_id = new_session.sessionid
            if 'PMB' in context.request.serverVariables['HTTP_USER_AGENT']:
                # if is a mobile client
                # add session id in special header
                context.response.set_header('Porcupine-Session', session_id)
            else:
                # add cookie with sessionid
                context.response.cookies['_sid'] = session_id
                context.response.cookies['_sid']['path'] = \
                    context.request.SCRIPT_NAME + '/'
            context.session = new_session
