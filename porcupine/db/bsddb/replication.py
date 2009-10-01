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
"Porcupine Server BerkeleyDB database replication services"
try:
    from bsddb3 import db
except ImportError:
    from bsddb import db

from porcupine.utils import misc
from porcupine.core.runtime import logger
from porcupine.config.services import services
from porcupine.core.services.management import MgtMessage, MgtRequest

class ReplicationService(object):
    master = None
    sites = {}

    def __init__(self, env, config):
        self.env = env
        self.client_startup_done = False
        self.config = config

        address = misc.get_address_from_string(self.config['address'])
        if 'management' in services:
            mgt_address = services['management'].addr
        else:
            mgt_address = None
        if 'main' in services:
            req_address = services['main'].addr
        else:
            req_address = None
        priority = self.config['priority']
        self.local_site = Site(address, mgt_address, req_address, priority)
        if 'site_address' not in self.config:
            self.local_site.is_master = True
            self.master = self.local_site

    def start(self):
        self.env.repmgr_set_local_site(*self.local_site.address)
        self.env.rep_set_priority(self.local_site.priority)
        self.env.rep_set_nsites(self.config['nsites'] - 1)
        if 'ack_policy' in self.config and \
                hasattr(db, self.config['ack_policy']):
            self.env.repmgr_set_ack_policy(
                getattr(db, self.config['ack_policy']))

        def event_notify(a, b, c):
            if b == db.DB_EVENT_REP_MASTER:
                self.local_site.is_master = True
                #print('MASTER')
                self._broadcast(MgtMessage('REP_NEW_MASTER', self.local_site))
                logger.info('REP: Node elected as new MASTER')
            elif b == db.DB_EVENT_REP_STARTUPDONE:
                self.client_startup_done = True
                logger.info('REP: Replication client startup is finished')

        self.env.set_event_notify(event_notify)
        
        if 'site_address' in self.config:
            # join an existing site
            site_address = misc.get_address_from_string(
                self.config['site_address'])
            self.join_site(site_address)
            if self.local_site.priority > 0:
                logger.info(
                  'REP: Starting replication manager and calling for election')
                role = db.DB_REP_ELECTION
            else:
                logger.info('REP: Starting replication manager as a client')
                role = db.DB_REP_CLIENT
        else:
            logger.info('REP: Starting replication manager as MASTER')
            # be a master
            role = db.DB_REP_MASTER
        # start replication manager
        self.env.repmgr_start(self.config['worker_threads'], role)

    def join_site(self, site_address):
        msg = MgtMessage('REP_JOIN_SITE', self.local_site)
        request = MgtRequest(msg.serialize())
        try:
            response = request.get_response(site_address)
        except:
            raise db.DBError('Replication site is unreachable')

        if response.header == 0:
            master, site_list = response.data
            self.master = master
            for site in site_list:
                self.add_remote_site(site)
        else:
            raise db.DBError(response.data)

    def get_site_list(self):
        return list(self.sites.values())

    def _broadcast(self, message):
        for site in self.get_site_list():
            request = MgtRequest(message.serialize())
            try:
                request.get_response(site.mgt_address)
            except:
                # the site is down
                logger.critical('REP: Site %s is down.' % (site.mgt_address, ))

    def add_remote_site(self, site, broadcast=False):
        if broadcast:
            self._broadcast(MgtMessage('REP_ADD_REMOTE_SITE', site))
        site_id = self.env.repmgr_add_remote_site(*site.address)
        self.sites[site_id] = site

class Site(object):
    def __init__(self, repmgr_address, management_address,
                 req_address, priority):
        self.address = repmgr_address
        self.mgt_address = management_address
        self.req_address = req_address
        self.is_master = False
        self.priority = priority
