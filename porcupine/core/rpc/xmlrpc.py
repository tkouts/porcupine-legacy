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
"Porcupine XML-RPC Library"
try:
    # python 2.6
    import xmlrpclib
except ImportError:
    # python 3
    import xmlrpc.client as xmlrpclib

from porcupine import systemObjects
from porcupine.core import objectSet
from porcupine.core.rpc import BaseEncoder
from porcupine.utils import date

def error(code, message, data):
    if data:
        message += '\n\n' + data
    return xmlrpclib.dumps(xmlrpclib.Fault(code, message))

def loads(s):
    return (None, xmlrpclib.loads(s)[0])

def dumps(request_id, obj, encoding):
    enc = _XMLRPCEncoder(allow_none=1, encoding=encoding)
    return '<?xml version="1.0"?><methodResponse>%s</methodResponse>' % \
           enc.dumps((obj, ))

class _XMLRPCEncoder(xmlrpclib.Marshaller, BaseEncoder):
    def __init__(self, *args, **kwargs):
        xmlrpclib.Marshaller.__init__(self, *args, **kwargs)
        # add custom dumpers
        self.dispatch[systemObjects.GenericItem] = _XMLRPCEncoder.dump_item
        self.dispatch[systemObjects.Composite] = _XMLRPCEncoder.dump_item
        self.dispatch[objectSet.ObjectSet] = _XMLRPCEncoder.dump_objectset
        self.dispatch[date.Date] = _XMLRPCEncoder.dump_date

    def dump_item(self, obj, write):
        self.dump_struct(self.default(obj), write)

    def dump_objectset(self, obj, write):
        self.dump_array(self.default(obj), write)

    def dump_date(self, date, write):
        self.dump_datetime(date.value, write)
