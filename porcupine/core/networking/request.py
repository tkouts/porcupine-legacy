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
Porcupine base classes for TCP requests
"""
import socket
from threading import RLock
from errno import EISCONN, EADDRINUSE

class BaseRequest(object):
    """
    Syncronous base request object
    """
    # port range to use when the ephemeral port range is exhausted
    _port_range = xrange(65535, 49150, -1)
    _client_ip = socket.gethostbyname(socket.gethostname())
    _host_ports = {}
    _next_port_lock = RLock()

    def __init__(self, buffer=''):
        self.buffer = buffer

    def __next_port(self, address):
        self._next_port_lock.acquire()
        next_port_index = self._host_port[address] = (
                self._host_ports.setdefault(address, -1) + 1
            ) % len(self._port_range)
        self._next_port_lock.release()
        return self._port_range[next_port_index]

    def get_response(self, address):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

        try:
            # TODO: remove this try
            # THIS TRY IS FOR DEBUGGING PURPOSES
            try:
                err = s.connect_ex(address)
                while not err in (0, EISCONN):
                    if err == EADDRINUSE:  # address already in use
                        # the ephemeral port range is exhausted
                        s.close()
                        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                        s.bind((SERVER_IP, self.__next_port(address)))
                    else:
                        # the host refuses conncetion
                        break
                    err = s.connect_ex(address)

                s.send(self.buffer)
                s.shutdown(1)
                # Get the response object from master
                response = []

                rdata = s.recv(8192)
                while rdata:
                    response.append(rdata)
                    rdata = s.recv(8192)
            except socket.error, v:
                import traceback
                import sys
                output = traceback.format_exception(*sys.exc_info())
                output = ''.join(output)
                print output
                raise

        finally:
            s.close()

        sResponse = ''.join(response)
        return(sResponse)
