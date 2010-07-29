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
This modules provides an offline handle for database access through
the Porcupine API.
"""
from porcupine import context
from porcupine.db import _db


def get_handle(**kwargs):
    if _db._db_handle is None or not _db._db_handle.is_open():
        # open database
        kwargs.setdefault('maintain', False)
        kwargs.setdefault('recover', 0)
        _db.open(**kwargs)
        identity = kwargs.get('identity', _db.get_item('system'))
        context.user = identity
    return _db


def close():
    _db.close(clear_env=True)
