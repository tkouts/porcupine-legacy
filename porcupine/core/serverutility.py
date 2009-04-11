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
Server proxy class module
"""
from porcupineserver import __version__
from porcupine.config.settings import settings
from porcupine import db

class Server(object):
    """
    Porcupine Server utility object
    
    A singleton of this type is available during
    execution of HTTP requests mainly for providing
    access to the server's database.
    
    @type db: L{db<porcupine.db>}
    @type temp_folder: str
    @type version: str
    """
    def get_temp_folder(self):
        """Getter of the L{temp_folder} property.
        
        @rtype: str
        """
        return settings['global']['temp_folder']
    temp_folder = property(get_temp_folder, None, None,
                           'The server\'s temporary folder')

    def get_db(self):
        """Getter of the L{db} property.
        
        @rtype: L{db<porcupine.db>}
        """
        return db
    db = property(get_db, None, None, 'Porcupine database handle')
    
    def get_version(self):
        """Getter of the L{version} property.
        
        @rtype: str
        """
        return __version__
    version = property(get_version, None, None, 'The server\'s version')
