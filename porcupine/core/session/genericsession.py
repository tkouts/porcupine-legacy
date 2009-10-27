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
"Session classes for single server and replicated environments"
import tempfile
import os
import glob

from porcupine.config.settings import settings
from porcupine.core.session import SessionManager
from porcupine.utils import misc

class GenericSession(object):
    """
    Porcupine server generic session type.
    
    @ivar sessionid: A unique identifier for the session
    @type sessionid: str

    @ivar userid: The object ID of the user that the session belongs
    @type userid: str
    """
    def __init__(self, sessionid, userid):
        self.sessionid = sessionid
        self.userid = userid

    def set_value(self, name, value):
        """
        Creates or updates a session variable.
        
        @param name: the name of the variable
        @type name: str
        
        @param value: the value of the variable.
        @type value: type
        
        @return: None
        """
        raise NotImplementedError

    def get_value(self, name):
        """
        Retrieves a session variable.
        
        @param name: the name of the variable
        @type name: str

        @rtype: type
        """
        raise NotImplementedError
    
    def remove_value(self, name):
        """
        Removes a session variable.
        
        @param name: the name of the variable
        @type name: str

        @rtype: None
        """
        raise NotImplementedError
    
    def get_data(self):
        """
        Returns all the session's variables.

        @rtype: dict
        """
        raise NotImplementedError

    def get_last_accessed(self):
        """
        Returns the session's last accessed time.

        @rtype: float
        """
        raise NotImplementedError

    def terminate(self):
        """
        Kills the session.

        @return: None
        """
        SessionManager.terminate_session(self)

    def getTempFile(self):
        """
        Creates a temporary file bound to the session.
        Returns a tuple containing an OS-level handle to an open
        file (as would be returned by os.open()) and the absolute
        pathname of that file, in that order.
        
        @rtype: tuple
        """
        return tempfile.mkstemp(prefix=self.sessionid,
                                dir=settings['global']['temp_folder'])
    
    def getTempFilename(self):
        """
        Returns a temporary file name bound to the session.
                
        @rtype: string
        """
        return "%s/%s_%s" % (settings['global']['temp_folder'],
                             self.sessionid,
                             misc.generate_oid())

    def remove_temp_files(self):
        """
        Removes all the session's temporary files.
        
        @return: None
        """
        tmp_files = glob.glob("%s/%s*" % (settings['global']['temp_folder'],
                                          self.sessionid + '*'))
        for tmp_file in tmp_files:
            os.remove(tmp_file)

