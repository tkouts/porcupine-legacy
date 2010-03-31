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
        # transaction
        self._trans = None
        # transaction used for read-only snapshot cursors
        # in order to avoid:
        # 1. lockers and txns starvation
        # 2. REP_LOCKOUT on clients when master goes down
        self._snapshot_txn = None
        # thread local storage of non-transactional open cursors
        self._cursors = []

    def _reset(self):
        # close any cursors left opened
        while self._cursors:
            self._cursors[0].close()

        #self._cursors = []
        if self._snapshot_txn is not None:
            self._snapshot_txn.abort()
            self._snapshot_txn = None

        self._trans = None
        # remove session
        if hasattr(self, 'session'):
            delattr(self, 'session')
