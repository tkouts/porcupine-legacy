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
try:
    # python 2.6
    from cPickle import dumps, loads
except ImportError:
    # python 3
    from pickle import dumps, loads

from porcupine.db import _db
from porcupine.core.runtime import logger
from porcupine.core.servicetypes import asyncserver
from porcupine.core.networking.request import BaseRequest
from porcupine.administration.package import Package
from porcupine.config.services import services
from porcupine.utils import misc

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
    runtime_services = [('db', (), {'recover':1, 'maintain':1, 'init_rep':1})]
    
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
                services.lock_db()
                try:
                    _db.backup(output_file)
                finally:
                    services.unlock_db()
                return (0, 'Database backup completed successfully.')
            
            elif cmd == 'DB_RESTORE':
                backup_set = request.data
                if not os.path.exists(backup_set):
                    raise IOError
                services.lock_db()
                services.close_db()
                try:
                    _db.restore(backup_set)
                finally:
                    services.open_db()
                    services.unlock_db()
                return (0, 'Database restore completed successfully.')
    
            elif cmd == 'DB_SHRINK':
                iLogs = _db.shrink()
                if iLogs:
                    return (0, 'Successfully removed %d log files.' % iLogs)
                else:
                    return (0, 'No log files removed.')

            # package management commands
            elif cmd == 'PACKAGE':
                ini_file = request.data
                my_pkg = None
                try:
                    my_pkg = Package(ini_file=ini_file)
                    my_pkg.create()
                finally:
                    if my_pkg is not None:
                        my_pkg.close()
                return (0, 'The package "%s-%s.ppf" was created succefully.'
                        % (my_pkg.name, my_pkg.version))

            elif cmd == 'INSTALL':
                # some scripts might require a security context
                from porcupine import context
                ppf_file = request.data
                my_pkg = None
                try:
                    my_pkg = Package(package_file=ppf_file)
                    # install as system
                    context.user = _db.get_item('system')
                    my_pkg.install()
                finally:
                    if my_pkg is not None:
                        my_pkg.close()
                    context.user = None
                return (0, 'The package "%s" was installed succefully.'
                        % ppf_file)

            elif cmd == 'UNINSTALL':
                # some scripts might require a security context
                from porcupine import context
                ppf_file = request.data
                my_pkg = None
                try:
                    my_pkg = Package(package_file=ppf_file)
                    # uninstall as system
                    context.user = _db.get_item('system')
                    my_pkg.uninstall()
                finally:
                    if my_pkg is not None:
                        my_pkg.close()
                    context.user = None
                return (0, 'The package "%s" was uninstalled succefully.'
                        % ppf_file)

            # replication commands
            elif cmd == 'SITE_INFO':
                rep_mgr = _db.get_replication_manager()
                if rep_mgr is not None:
                    site_list = list(rep_mgr.get_site_list().values())
                    site_list.append(
                        rep_mgr.local_site.address + (1,))
                    #print site_list
                    info = [str.format('{0:25}{1:10}{2:6}',
                                      'SITE', 'STATUS', 'MASTER'),
                            '-' * 41]
                    for site in site_list:
                        site_address = site[:2]
                        if site[2] == 1:
                            s = 'ONLINE'
                        else:
                            s = 'OFFLINE'
                        if rep_mgr.master and \
                                rep_mgr.master.address == site_address:
                            m = 'X'
                        else:
                            m = ''
                        info.append(str.format('{0:25}{1:10}{2:6}',
                                               site_address, s, m))

                    info.append('')
                    info.append('Total sites: %d' % len(site_list))
                    return (0, '\n'.join(info))
                else:
                    raise NotImplementedError

            elif cmd == 'REP_JOIN_SITE':
                rep_mgr = _db.get_replication_manager()
                if rep_mgr is not None:
                    site = request.data
                    #print('adding remote site %s' % (site.address, ))
                    site_list = rep_mgr.sites.values() + [rep_mgr.local_site]
                    rep_mgr.broadcast(
                        MgtMessage('REP_ADD_REMOTE_SITE', site)
                    )
                    rep_mgr.add_remote_site(site)
                    return (0, [rep_mgr.master, site_list])
                else:
                    raise NotImplementedError

            elif cmd == 'REP_ADD_REMOTE_SITE':
                rep_mgr = _db.get_replication_manager()
                if rep_mgr is not None:
                    site = request.data
                    #print('adding remote site %s' % (site.address, ))
                    rep_mgr.add_remote_site(site)
                    return (0, None)
                else:
                    raise NotImplementedError

            elif cmd == 'REP_NEW_MASTER':
                rep_mgr = _db.get_replication_manager()
                if rep_mgr is not None:
                    master = request.data
                    #print('new master is %s' % (master.address, ))
                    rep_mgr.master = master
                    services.notify(('NEW_MASTER', master))
                    return (0, None)
                else:
                    raise NotImplementedError

            # other
            elif cmd == 'RELOAD':
                mod = misc.get_rto_by_name(request.data)
                misc.reload_module_tree(mod)
                services.notify(('RELOAD_PACKAGE', request.data))
                return (0, 'Reloaded module tree "%s"' % request.data)

            # unknown command
            else:
                logger.warning(
                    'Management service received unknown command: %s' % cmd)
                return (-1, 'Unknown command.')

        except IOError:
            return (-1, 'Invalid file path.')
        except NotImplementedError:
            return (-1, 'Unsupported command.')
