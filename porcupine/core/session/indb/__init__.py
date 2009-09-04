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
Porcupine database session manager
"""
import time
from threading import Thread

from porcupine import db
from porcupine.core.session.genericsessionmanager import GenericSessionManager
from porcupine.core.session.indb import schema

class SessionManager(GenericSessionManager):
    """
    Database session manager implementation class
    """
    supports_multiple_processes = True
    session_container_id = '+sessions'
    _expire_thread = Thread(name='Session expriration thread',
                            target=None)
    
    def __init__(self, timeout, **kwargs):
        GenericSessionManager.__init__(self, timeout)
        session_container = db._db.get_item(self.session_container_id)
        if session_container is None:
            self._create_container()
        self._is_active = True

    @db.transactional(auto_commit=True)
    def _create_container(self):
        ftime = time.time()
        session_container = schema.SessionsContainer()
        session_container._id = self.session_container_id
        session_container.displayName.value = 'Sessions'
        session_container._isSystem = True
        session_container._owner = 'system'
        session_container.modifiedBy = 'SYSTEM'
        session_container._created = ftime
        session_container.modified = ftime
        session_container.inheritRoles = False
        session_container.security = {'administrators' : 8}
        db._db.put_item(session_container)

    def init_expiration_mechanism(self):
        if not self._expire_thread.isAlive():
            self._expire_thread._Thread__target = self._expire_sessions
            self._expire_thread.start()

    def _expire_sessions(self):
        from porcupine.core.runtime import logger
        while self._is_active:
            try:
                expire_threshold = time.time() - self.timeout - \
                                   self.revive_threshold
                # get inactive sessions
                cursor = db._db.query((
                        ('modified', (None, (expire_threshold, False))),
                    ))
                cursor.set_scope(self.session_container_id)
                cursor.enforce_permissions = False
                sessions = [session for session in cursor]
                cursor.close()
                for session in sessions:
                    logger.debug('Expiring Session: %s' % session.id)
                    session.terminate()
            except Exception as e:
                logger.error('Error in session expiration thread: %s' % e)
            time.sleep(3.0)

    @db.transactional(auto_commit=True, nosync=True)
    def create_session(self, userid):
        session = schema.Session(userid, {})
        session.append_to(self.session_container_id)
        return session

    def get_session(self, sessionid):
        session = db._db.get_item(sessionid)
        return session

    @db.transactional(auto_commit=True, nosync=True)
    def remove_session(self, sessionid):
        session = db._db.get_item(sessionid)
        session.delete()

    @db.transactional(auto_commit=True, nosync=True)
    def revive_session(self, session):
        session.update()

    def close(self):
        self._is_active = False
        if self._expire_thread.isAlive():
            self._expire_thread.join()
