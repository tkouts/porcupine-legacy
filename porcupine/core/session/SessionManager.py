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
"Porcupine Server session manager singleton"
import time

_sm = None

def open(sm_type, session_timeout, init_expiration, **kwargs):
    global _sm
    if _sm == None:
        _sm = sm_type(session_timeout, **kwargs)
        if init_expiration:
            _sm.init_expiration_mechanism()
        return True
    else:
        return False
    
def create(userid):
    # create new session
    new_session = _sm.create_session(userid)
    return new_session
   
def fetch_session(sessionid):
    session = _sm.get_session(sessionid)
    if session != None and \
            time.time() - session.get_last_accessed() > _sm.revive_threshold:
        _sm.revive_session(session)
    return session

def terminate_session(session):
    _sm.remove_session(session.sessionid)
    session.remove_temp_files()
    
def close():
    global _sm
    if _sm != None:
        _sm.close()
        _sm = None
