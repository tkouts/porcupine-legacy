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
"Security context thread local class"
from threading import local
from porcupine.core.serverutility import Server


class Context(local):

    server = Server()

    def __init__(self):
        self.user = None
        # transaction handle
        self._trans = None
        self._is_txnal = False

    def _teardown(self):
        self.user = None

        if self._trans is not None:
            self._trans.abort()
        self._trans = None

        # remove session
        if hasattr(self, 'session'):
            delattr(self, 'session')

        # remove original user
        if hasattr(self, 'original_user'):
            delattr(self, 'original_user')
