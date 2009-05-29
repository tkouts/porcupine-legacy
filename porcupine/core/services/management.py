#===============================================================================
#    Copyright 2005-2009 Tassos Koutsovassilis
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
"Porcupine Server management service"
import os
from cPickle import dumps, loads

from porcupine.core.runtime import logger
from porcupine.core.servicetypes import asyncserver
from porcupine.core.networking.request import BaseRequest
from porcupine.config import services
from porcupine.db import _db

class MgtRequest(BaseRequest):
    def get_response(self, addr):
        resp = BaseRequest.get_response(self, addr)
        response = MgtMessage()
        response.load(resp)
        return response

class MgtMessage(object):
    """
    Management message exchange class
    """
    def __init__(self, header=None, data=None):
        self.__msg = [header, data]

    def get_header(self):
        return(self.__msg[0])
    header = property(get_header)

    def get_data(self):
        return(self.__msg[1])
    data = property(get_data)

    def load(self, s):
        self.__msg = loads(s)

    def serialize(self):
        s = dumps(self.__msg)
        return(s)

class ManagementServer(asyncserver.BaseServer):
    "Management Service"
    runtime_services = [('db', (), {})]
    
    def __init__(self, name, address, processes, worker_threads):
        asyncserver.BaseServer.__init__(self, name, address, processes,
                                        worker_threads, ManagementThread)

class ManagementThread(asyncserver.BaseServerThread):
    "Porcupine Server Management thread"
    def handle_request(self, rh):
        request = MgtMessage()
        request.load(rh.input_buffer)
        cmd = request.header
        
        try:
            args = self.execute_command(cmd, request)
            if args:
                response = MgtMessage(*args)
                # send the response
                rh.write_buffer(response.serialize())
        except:
            logger.error('Management Error:', *(), **{'exc_info':1})
            error_msg = MgtMessage(-1,
                        'Internal server error. See server log for details.')
            rh.write_buffer(error_msg.serialize())

    def execute_command(self, cmd, request):
        try:
            # DB maintenance commands
            if cmd == 'DB_BACKUP':
                output_file = request.data
                if not os.path.isdir(os.path.dirname(output_file)):
                    raise IOError
                services.services['_controller'].lock_db()
                try:
                    _db.backup(output_file)
                finally:
                    services.services['_controller'].unlock_db()
                return (0, 'Database backup completed successfully.')
            
            elif cmd == 'DB_RESTORE':
                backup_set = request.data
                if not os.path.exists(backup_set):
                    raise IOError
                services.services['_controller'].lock_db()
                services.services['_controller'].close_db()
                try:
                    _db.restore(backup_set)
                finally:
                    services.services['_controller'].open_db()
                    services.services['_controller'].unlock_db()
                return (0, 'Database restore completed successfully.')
    
            elif cmd == 'DB_SHRINK':
                iLogs = _db.shrink()
                if iLogs:
                    return (0, 'Successfully removed %d log files.' % iLogs)
                else:
                    return (0, 'No log files removed.')
            
            # unknown command
            else:
                logger.warning(
                    'Management service received unknown command: %s' % cmd)
                return (-1, 'Unknown command.')
        except IOError:
            return (-1, 'Invalid file path.')
        except NotImplementedError:
            return (-1, 'Unsupported command.')
