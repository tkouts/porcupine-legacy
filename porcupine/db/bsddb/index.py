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
from porcupine.db.bsddb import db
from porcupine.db.baseindex import BaseIndex

class DbIndex(BaseIndex):
    db_mode = 0660
    db_flags = db.DB_THREAD | db.DB_CREATE | db.DB_AUTO_COMMIT
    
    def __init__(self, env, primary_db, name, unique=False):
        BaseIndex.__init__(self, name, unique)
        self.db = db.DB(env)
        self.db.set_flags(db.DB_DUPSORT)
        self.db.open(
            'porcupine.idx',
            name,
            dbtype = db.DB_BTREE,
            mode = self.db_mode,
            flags = self.db_flags
        )
        primary_db.associate(self.db,
                             self.callback,
                             flags=db.DB_CREATE)
    def close(self):
        self.db.close()

