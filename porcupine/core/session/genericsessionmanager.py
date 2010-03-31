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
"""
Generic Session Manager class.
Use it as a base class in order to implement your own session manager.
"""


class GenericSessionManager(object):
    revive_threshold = 60.0
    supports_multiple_processes = False
    requires_cookies = False

    def __init__(self, timeout):
        self.timeout = timeout

    def init_expiration_mechanism(self):
        raise NotImplementedError

    def create_session(self, userid):
        raise NotImplementedError

    def get_session(self, sessionid):
        raise NotImplementedError

    def remove_session(self, sessionid):
        raise NotImplementedError

    def revive_session(self, session):
        raise NotImplementedError

    def close(self):
        raise NotImplementedError
