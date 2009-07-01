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
Porcupine database session manager content classes
"""
from porcupine.core.decorators import deprecated
import time

from porcupine import db
from porcupine import exceptions
from porcupine.systemObjects import Container, GenericItem
from porcupine.core.session.genericsession import GenericSession

class SessionsContainer(Container):
    """
    Container used for keeping active sessions
    """
    containment = ('porcupine.core.session.indb.schema.Session', )

class Session(GenericItem, GenericSession):
    """
    Session object
    """
    def __init__(self, userid, sessiondata):
        GenericItem.__init__(self)
        self.displayName.value = self._id
        self.__data = sessiondata
        self.__userid = userid

    @db.transactional(auto_commit=True, nosync=True)
    def set_value(self, name, value):
        session = db.get_item(self._id)
        session.__data[name] = value
        session.update()
    setValue = deprecated(set_value)

    def get_value(self, name):
        return self.__data.get(name, None)
    getValue = deprecated(get_value)
    
    def get_data(self):
        return(self.__data)

    def get_userid(self):
        return self.__userid

    @db.transactional(auto_commit=True, nosync=True)
    def set_userid(self, value):
        self.__userid = value
        self.update()
    userid = property(get_userid, set_userid)

    def get_sessionid(self):
        return self._id
    sessionid = property(get_sessionid)

    @db.requires_transactional_context
    def append_to(self, parent, trans=None):
        """
        A lighter append_to
        """
        if type(parent) == str:
            parent = db._db.get_item(parent)
        
        if not(self.get_contentclass() in parent.containment):
            raise exceptions.ContainmentError, \
                'The target container does not accept ' + \
                'objects of type\n"%s".' % contentclass
        
        self._owner = 'system'
        self._created = time.time()
        self.modifiedBy = 'SYSTEM'
        self.modified = time.time()
        self._parentid = parent._id
        db._db.put_item(self)

    @db.requires_transactional_context
    def update(self, trans=None):
        """
        A lighter update
        """
        self.modified = time.time()
        db._db.put_item(self)

    @db.requires_transactional_context
    def delete(self, trans=None):
        """
        A lighter delete
        """
        db._db.delete_item(self)

    def get_last_accessed(self):
        return self.modified
