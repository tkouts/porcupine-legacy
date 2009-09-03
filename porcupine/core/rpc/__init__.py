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
"Porcupine RPC Libraries"
from porcupine import datatypes
from porcupine import systemObjects
from porcupine.core import objectSet
from porcupine.utils import date

class BaseEncoder(object):
    default_props = ('id', 'modified', 'owner', 'created', '__image__',
                     'contentclass', 'parentid', 'isCollection')

    def default(self, obj):
        if isinstance(obj, objectSet.ObjectSet):
            return list(obj)
        elif isinstance(obj, (systemObjects.GenericItem,
                              systemObjects.Composite)):
            rpc_object = {}
            for attr in obj.__props__ + self.default_props:
                try:
                    oAttr = getattr(obj, attr)
                except AttributeError:
                    continue
                if isinstance(oAttr, datatypes.ExternalAttribute):
                    rpc_object[attr] = '[EXTERNAL STREAM]'
                elif isinstance(oAttr, datatypes.ReferenceN):
                    rpc_object[attr] = [{'id': x._id,
                                         'displayName': x.displayName.value}
                                        for x in oAttr.get_items()]
                elif isinstance(oAttr, datatypes.Reference1):
                    item_ref = oAttr.get_item()
                    rpc_object[attr] = {'id': oAttr.value}
                    if item_ref is not None:
                        rpc_object[attr]['displayName'] = \
                            item_ref.displayName.value
                elif isinstance(oAttr, datatypes.Date):
                    rpc_object[attr] = oAttr
                elif isinstance(oAttr, datatypes.DataType):
                    rpc_object[attr] = oAttr.value
                elif attr in ('created', 'modified'):
                    rpc_object[attr] = date.Date(oAttr)
                else:
                    rpc_object[attr] = oAttr
            return rpc_object
        elif isinstance(obj, date.Date):
            return obj.to_iso_8601()
        else:
            return obj
