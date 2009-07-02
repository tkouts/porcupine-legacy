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
Porcupine Server Base Transaction class
"""
from threading import Semaphore

from porcupine.db import _db
from porcupine.config.settings import settings

class BaseTransaction(object):
    "The base type of a Porcupine transaction."
    txn_max_retries = settings['store'].get('trans_max_retries', 12)
    txn_max = settings['store'].get('max_tx', 20)
    _txn_max_s = Semaphore(txn_max)
    
    def __init__(self):
        self._txn_max_s.acquire()
        _db._activeTxns += 1

    def _retry(self):
        self._txn_max_s.acquire()
        _db._activeTxns += 1

    def commit(self):
        """
        Commits the transaction.

        @return: None
        """
        self._txn_max_s.release()
        _db._activeTxns -= 1

    def abort(self):
        """
        Aborts the transaction.

        @return: None
        """
        self._txn_max_s.release()
        _db._activeTxns -= 1
