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
Porcupine miscelaneous utilities
"""
import io
import hashlib
import time
import random
import os
import sys
import imp

from porcupine.core.compat import str
from porcupine.core.decorators import deprecated

_VALID_ID_CHRS = [
    chr(x) for x in \
    list(range(ord('a'), ord('z'))) +
    list(range(ord('A'), ord('Z'))) +
    list(range(ord('0'), ord('9')))
]

def main_is_frozen():
    return (hasattr(sys, "frozen")          # new py2exe
            or hasattr(sys, "importers")    # old py2exe
            or imp.is_frozen("__main__"))   # tools/freeze

def freeze_support():
    if main_is_frozen():
        sys.path.insert(0, '')
        try:
            import multiprocessing
            multiprocessing.freeze_support()
        except ImportError:
            pass

def generate_file_etag(path):
    file_info = os.stat(path)
    return hex(file_info[6] + file_info[8])

def hash(*args, **kwargs):
    bt = io.BytesIO()
    for arg in args:
        if isinstance(arg, str):
            arg = arg.encode('utf-8')
        bt.write(arg)
    hash = getattr(hashlib, kwargs.get('algo', 'md5'))(bt.getvalue())
    bt.close()
    return hash

def generate_guid():
    """
    Generates a GUID string.
    
    The GUID length is 32 characters. It is used by the
    session manager to generate session IDs.
    
    @rtype: str
    """
    return hashlib.md5(str(time.time() + time.clock()*1000)).hexdigest()
generateGUID = deprecated(generate_guid)

def generate_oid():
    """
    Generates an Object ID string.
    
    The generated ID is 8 characters long.
    
    @rtype: str
    """
    return ''.join(random.sample(_VALID_ID_CHRS, 8))
generateOID = deprecated(generate_oid)

def get_rto_by_name(name):
    """
    This function returns a runtime object by name.
    
    For example::
    
        get_rto_by_name('org.innoscript.desktop.schema.common.Folder')()
    
    instantiates a new I{Folder} object.
        
    @rtype: callable type
    """
    modules = name.split('.')
    if len(modules)==1:
        __module__ = modules[0]
        __attribute__ = []
    else:
        __module__ = '.'.join(modules[:-1])
        __attribute__ = modules[-1]
    
    mod = __import__(__module__, globals(), locals(), [__attribute__])
    if __attribute__:
        attribute = getattr(mod, __attribute__)
        return attribute
    else:
        return mod
getCallableByName = deprecated(get_rto_by_name)

def get_address_from_string(address):
    """
    Accepts a string of the form
    C{address:port} and returns an C{(address, port)} tuple.
    
    @param address: string of the form C{address:port}
    @type address: str
    
    @rtype: tuple
    """
    address = address.split(':')
    address[1] = int(address[1])
    return tuple(address)
getAddressFromString = deprecated(get_address_from_string)
    
def get_full_path(item):
    """
    Returns the full path of an object
    
    @param item: a Porcupine Object
    @type item: L{GenericItem<porcupine.systemObjects.GenericItem>}
    
    @rtype: str
    """
    parents = item.get_all_parents()
    sPath = '/'
    for parent in parents:
        sPath += parent.displayName.value + '/'
    return sPath
getFullPath = deprecated(get_full_path)
