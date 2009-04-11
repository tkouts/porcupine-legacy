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
"Porcupine configured services loader"

from porcupine.config.settings import settings
from porcupine.utils import misc

services = {}

def start():
    for service in settings['services']:
        name = service['name']
        type = service['type']
        service_class = misc.get_rto_by_name(service['class'])
        
        if type == 'TCPListener':
            address = misc.get_address_from_string(service['address'])
            worker_processes = service['worker_processes']
            worker_threads = int(service['worker_threads'])
            services[name] = service_class(name, address, worker_processes,
                                           worker_threads)
        elif type == 'ScheduledTask':
            interval = int(service['interval'])
            services[name] = service_class(name, interval)

        # add parameters
        if service.has_key('parameters'):
            services[name].parameters = service['parameters']
            
        # start service
        services[name].start()

def get_services_by_type(t):
    return [service for service in services.values()
            if service.type == t]

def stop():
    for service_name in services:
        if service_name != '_controller':
            services[service_name].shutdown()
