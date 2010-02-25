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
"Porcupine server Berkeley DB index"
from porcupine import exceptions
from porcupine.db.bsddb import db
from porcupine.db.baseindex import BaseIndex
from porcupine.utils.db import _err_unsupported_index_type

class DbIndex(BaseIndex):
    """
    BerkeleyDB index
    """
    def __init__(self, env, primary_db, name, unique, immutable, db_flags):
        BaseIndex.__init__(self, name, unique)

        while True:
            try:
                self.db = db.DB(env)
                self.db.set_pagesize(1024)
                if not unique:
                    self.db.set_flags(db.DB_DUPSORT)
                self.db.open(
                    'porcupine.idx',
                    name,
                    dbtype = db.DB_BTREE,
                    mode = 0o660,
                    flags = db_flags
                )
                flags = db.DB_CREATE
                if immutable:
                    if hasattr(db, 'DB_IMMUTABLE_KEY'):
                        flags |= db.DB_IMMUTABLE_KEY
                    #else:
                    #    flags |= 0x00000002
                primary_db.associate(self.db,
                                     self.callback,
                                     flags=flags)

            except db.DBLockDeadlockError:
                self.db.close()
                continue

            except db.DBError as e:
                if e.args[0] == _err_unsupported_index_type:
                    # remove index
                    self.close()
                    _db = db.DB(env)
                    _db.remove('porcupine.idx', dbname=name)
                    raise exceptions.ConfigurationError(
                        'Unsupported data type for index "%s".' % name)
                else:
                    raise
            break

    def close(self):
        self.db.close()
