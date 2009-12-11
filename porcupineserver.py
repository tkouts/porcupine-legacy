#!/usr/bin/env python
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
"Porcupine Server"
import sys
import os
import time
import signal
import select
import asyncore
from errno import EINTR
from threading import Thread

from porcupine.core import runtime
from porcupine.config import services
from porcupine.utils.misc import freeze_support

__version__ = '0.6 build(20090402)'
PID_FILE = 'conf/.pid'

class Controller(object):
    def __init__(self):
        #self.shutdowninprogress = False
        self.running = False
        self.services = services.services
    
    def start(self):
        try:
            runtime.logger.info('Server starting...')
            # start services
            runtime.logger.info('Starting services...')
            services.start()
        except Exception as e:
            runtime.logger.error(e, *(), **{'exc_info' : True})
            # stop services
            services.stop()
            raise e

        # start asyn thread
        self._asyn_thread = Thread(target=self._async_loop,
                                   name='Asyncore thread')
        self._asyn_thread.start()
        
        self.running = True

        # record process id
        pidfile = open(PID_FILE, "w")
        if os.name == 'posix':
            pidfile.write(str(os.getpgid(os.getpid())))
        else:
            pidfile.write(str(os.getpid()))
        pidfile.close()
        
        runtime.logger.info('Porcupine Server started succesfully')
        print('Porcupine Server v%s' % __version__)
        python_version = 'Python %s' % sys.version
        runtime.logger.info(python_version)
        print(python_version)
        print('''Porcupine comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it under
certain conditions; See COPYING for more details.''')

    def _async_loop(self):
        _use_poll = False
        if hasattr(select, 'poll'):
            _use_poll = True
        try:
            asyncore.loop(16.0, _use_poll)
        except select.error as v:
            if v.args[0] == EINTR:
                print('Shutdown not completely clean...')
            else:
                pass
        
    def shutdown(self, arg1=None, arg2=None):
        print('Initiating shutdown...')
        runtime.logger.info('Initiating shutdown...')
        self.running = False

        # stop services
        runtime.logger.info('Stopping services...')
        services.stop()
        
        # join asyn thread
        asyncore.close_all()
        self._asyn_thread.join()

def main(args):
    for arg in args:
        if arg == 'daemon':
            if os.name == 'posix':
                out = open('nul', 'w')
                sys.stdout = out
                sys.stderr = out
                pid = os.fork()
                if pid:
                    sys.exit()
            else:
                print('Your operating system does not support daemon mode.')
        elif arg == 'stop':
            pidfile = open(PID_FILE, 'r')
            pid = int(pidfile.read())
            pidfile.close
            if os.name == 'posix':
                os.killpg(pid, signal.SIGINT)
            else:
                print('Your operating system does not support this command.')
            sys.exit()

    try:
        controller = Controller()
        controller.start()
    except Exception as e:
        import traceback
        output = traceback.format_exception(*sys.exc_info())
        output = ''.join(output)
        print(output)
        sys.exit(e)

    signal.signal(signal.SIGINT, controller.shutdown)
    signal.signal(signal.SIGTERM, controller.shutdown)

    try:
        while controller.running:
            time.sleep(16.0)
    except IOError:
        pass

    sys.exit()

if __name__=='__main__':
    freeze_support()
    main(sys.argv[1:])
