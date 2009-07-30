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
"Porcupine main service"
from porcupine import exceptions
from porcupine.utils import misc
from porcupine.config.settings import settings
from porcupine.core.servicetypes import asyncserver
from porcupine.core.services.pthread import PorcupineThread

class PorcupineServer(asyncserver.BaseServer):
    "Porcupine server class"
    runtime_services = [('config', (), {}),
                        ('db', (), {'recover':1}),
                        ('session_manager', (), {})]

    def __init__(self, name, address, processes, threads):
        asyncserver.BaseServer.__init__(self, name, address, processes, threads,
                                        PorcupineThread)
        
        if self.is_multiprocess:
            # check if session manager supports multiple processes
            sm_class = misc.get_rto_by_name(
                settings['sessionmanager']['interface'])
            if not sm_class.supports_multiple_processes:
                raise exceptions.ConfigurationError(
                    'The session manager class does not support '
                    'multiple processes.')
