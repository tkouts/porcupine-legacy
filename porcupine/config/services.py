#==============================================================================
#   Copyright 2005-2009, Tassos Koutsovassilis
#
#   This file is part of Porcupine.
#   Porcupine is free software; you can redistribute it and/or modify
#   it under the terms of the GNU Lesser General Public License as published by
#   the Free Software Foundation; either version 2.1 of the License, or
#   (at your option) any later version.
#   Porcupine is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU Lesser General Public License for more details.
#   You should have received a copy of the GNU Lesser General Public License
#   along with Porcupine; if not, write to the Free Software
#   Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
#==============================================================================
"Porcupine services loader"
from collections import Mapping

from porcupine.config.settings import settings
from porcupine.utils import misc


class ServicesCollection(Mapping):
    def __init__(self):
        self.services_list = []

    def __getitem__(self, name):
        for service in self.services_list:
            if service.name == name:
                return service

    def __iter__(self):
        return iter(self.services_list)

    def __len__(self):
        return len(self.services_list)

    def __contains__(self, key):
        return key in [s.name for s in self.services_list]

    def get_services_by_type(self, t):
        return [service for service in self.services_list
                if service.type == t]

    def notify(self, message):
        servers = self.get_services_by_type('TCPListener')
        for server in servers:
            if server.is_multiprocess:
                server.send(message)

    def lock_db(self):
        [s.lock_db() for s in self.services_list]

    def unlock_db(self):
        [s.unlock_db() for s in self.services_list]

    def open_db(self):
        [s.add_runtime_service('db')
         for s in self.services_list]

    def close_db(self):
        [s.remove_runtime_service('db')
         for s in self.services_list]

services = ServicesCollection()


def start():
    for service in settings['services']:
        name = service['name']
        type = service['type']
        service_class = misc.get_rto_by_name(service['class'])

        if type == 'TCPListener':
            address = misc.get_address_from_string(service['address'])
            worker_processes = service['worker_processes']
            worker_threads = int(service['worker_threads'])
            svc = service_class(name, address, worker_processes,
                                    worker_threads)
        elif type == 'ScheduledTask':
            interval = int(service['interval'])
            svc = service_class(name, interval)

        # add parameters
        if 'parameters' in service:
            svc.parameters = service['parameters']

        services.services_list.append(svc)

    # start services
    for service in services:
        service.start()


def stop():
    svcs = list(services)
    svcs.reverse()
    for service in svcs:
        service.shutdown()
