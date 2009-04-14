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
Porcupine cookie based session manager classes
"""
import time
import hashlib

from porcupine import HttpContext, exceptions
from porcupine.utils import misc
from porcupine.core import persist
from porcupine.core.session.genericsessionmanager import GenericSessionManager
from porcupine.core.session.genericsession import GenericSession
from porcupine.core.decorators import deprecated

class SessionManager(GenericSessionManager):
    """
    Cookie based session manager implementation class
    """
    supports_multiple_processes = True

    def __init__(self, timeout, **kwargs):
        GenericSessionManager.__init__(self, timeout)
        secret = kwargs.get('secret', None)
        if not secret:
            raise exceptions.ConfigurationError, \
                'The cookie based session manager should define a secret phrase.'
        Session.secret = secret

    def init_expiration_mechanism(self):
        pass

    def create_session(self, userid):
        session = Session(userid, {})
        session._update()
        return session

    def get_session(self, sessionid):
        request = HttpContext.current().request
        return Session.load(request)

    def remove_session(self, sessionid):
        pass

    def revive_session(self, session):
        pass

    def close(self):
        pass

class Session(GenericSession):
    """
    Session class for the cookie based session manager
    """
    secret = None

    def __init__(self, userid, sessiondata):
        GenericSession.__init__(self, misc.generate_oid(), userid)
        self.sig = self._get_sig()
        self.__userid = userid
        self.__data = sessiondata

    @staticmethod
    def load(request):
        i = 0
        chunks = []
        session = request.cookies.get('_s%d' % i, None)
        while session != None:
            chunks.append(session.value)
            i += 1
            session = request.cookies.get('_s%d' % i, None)
        if chunks:
            session = persist.loads(''.join(chunks))
            sig = hashlib.sha256(session.sessionid + session.userid +
                                 Session.secret).hexdigest()
            if session.sig != sig:
                session = None
        return session
        
    def _get_sig(self):
        sig = hashlib.sha256(self.sessionid + self.__userid + self.secret)
        return sig.hexdigest()
    
    def _update(self):
        context = HttpContext.current()
        chunk = persist.dumps(self)
        chunks = [chunk[i:i + 4000]
                  for i in range(0, len(chunk), 4000)]
        for i in range(len(chunks)):
            context.response.cookies['_s%d' % i] = chunks[i]
            context.response.cookies['_s%d' % i]['path'] = \
                context.request.serverVariables['SCRIPT_NAME']
        j = len(chunks)
        next = context.request.cookies.get('_s%d' % j)
        while next:
            del context.request.cookies['_s%d' % j]
            j += 1
            next = context.request.cookies.get('_s%d' % j)

    def get_userid(self):
        return self.__userid

    def set_userid(self, value):
        self.__userid = value
        self.sig = self._get_sig()
        self._update()
    userid = property(get_userid, set_userid)

    def set_value(self, name, value):
        self.__data[name] = value
        self._update()
    setValue = deprecated(set_value)

    def get_value(self, name):
        return self.__data.get(name, None)
    getValue = deprecated(get_value)

    def get_data(self):
        return(self.__data)

    def get_last_accessed(self):
        return time.time()
