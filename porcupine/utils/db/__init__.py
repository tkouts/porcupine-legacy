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
"Porcupine database utilities used by the system"
import struct

_err_unsupported_type = -2334

def initialize_db():
    "Initializes the Porcupine database"
    # TODO: implement db initialization

def pack_value(value):
    """
    Packs Python values to C structs used for indexed lookups.
    Currently supported types include strings, booleans, floats and integers.
    """
    packed = None
    if type(value) == str:
        packed = struct.pack('%ds' % len(value), value)
    elif type(value) == bool or value == None:
        packed = struct.pack('?', value)
    elif type(value) == int:
        packed = struct.pack('>l', value)
    elif type(value) == float:
        packed = struct.pack('>f', value)
    else:
        # unsupported data type
        packed = _err_unsupported_type
    return packed
