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
Porcupine Server BSDDB Transaction class
"""
from porcupine import exceptions
from porcupine.db.bsddb import db
from porcupine.db.basetransaction import BaseTransaction

class Transaction(BaseTransaction):
    def __init__(self, env, nosync):
        self.env = env
        self._flags = db.DB_READ_COMMITTED
        if nosync:
            self._flags |= db.DB_TXN_NOSYNC
        self._cursors = []
        self.txn = env.txn_begin(None, self._flags)
        BaseTransaction.__init__(self)

    def _retry(self):
        self._cursors = []
        self.txn = self.env.txn_begin(None, self._flags)
        BaseTransaction._retry(self)

    def _close_cursors(self):
        clean = True
        for c in self._cursors:
            try:
                c._close()
            except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
                clean = False
        self._cursors = []
        return clean

    def commit(self):
        """
        Commits the transaction.

        @return: None
        """
        if len(self._cursors) > 0:
            # some cursors are left open, just close them
            if not self._close_cursors():
                self.abort()
                raise exceptions.DBRetryTransaction
        #try:
        self.txn.commit()
        #except (db.DBLockDeadlockError, db.DBLockNotGrantedError):
        #    self.abort()
        #    raise exceptions.DBRetryTransaction
        BaseTransaction.commit(self)

    def abort(self):
        """
        Aborts the transaction.

        @return: None
        """
        self._close_cursors()
        self.txn.abort()
        BaseTransaction.abort(self)
