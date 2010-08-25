#==============================================================================
#   Copyright (c) 2005-2010, Tassos Koutsovassilis
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
"Porcupine service base class"
from porcupine.core import runtime


class BaseService(object):
    runtime_services = []
    type = None

    def __init__(self, name):
        self.name = name
        self.parameters = None
        self.running = False
        self.started_services = []

    def start(self):
        for component, args, kwargs in self.runtime_services:
            inited = self.add_runtime_service(component, *args, **kwargs)
            if inited:
                self.started_services.append(component)

    def shutdown(self):
        self.started_services.reverse()
        for component in self.started_services:
            self.remove_runtime_service(component)

    def add_runtime_service(self, component, *args, **kwargs):
        if not(args or kwargs):
            args, kwargs = [(x[1], x[2]) for x in self.runtime_services
                            if x[0] == component][0]
        inited = getattr(runtime, 'init_' + component)(*args, **kwargs)
        if inited:
            runtime.logger.info('Service "%s" - Initialized %s' %
                                (self.name, component))
        return inited

    def remove_runtime_service(self, component):
        if component in self.started_services:
            runtime.logger.info('Service "%s" - Closing %s' %
                                (self.name, component))
            getattr(runtime, 'close_' + component)()

    def lock_db(self):
        if 'db' in self.started_services:
            runtime.lock_db()

    def unlock_db(self):
        if 'db' in self.started_services:
            runtime.unlock_db()
