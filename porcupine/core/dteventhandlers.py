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
"Porcupine server built-in datatypes event handlers"
import os

from porcupine import db
from porcupine.db import _db
from porcupine import exceptions
from porcupine.utils import misc

class DatatypeEventHandler(object):
    @staticmethod
    def on_create(item, attr, trans):
        pass

    @staticmethod
    def on_update(item, new_attr, old_attr, trans):
        pass
    
    @staticmethod
    def on_delete(item, attr, trans, bPermanent):
        pass
    
    @staticmethod
    def on_undelete(item, attr, trans):
        pass

class CompositionEventHandler(DatatypeEventHandler):
    "Composition datatype event handler"
    
    @staticmethod
    def on_create(item, attr, trans):
        CompositionEventHandler.on_update(item, attr, None, trans)
    
    @staticmethod
    def on_update(item, new_attr, old_attr, trans):
        from porcupine.systemObjects import Composite
        # load objects
        dctObjects = {}
        for i, obj in enumerate(new_attr.value):
            if isinstance(obj, Composite):
                obj._containerid = item._id
            elif isinstance(obj, str):
                obj = _db.get_item(obj, trans)
                new_attr.value[i] = obj
            else:
                raise exceptions.ContainmentError, \
                    'Invalid object type "%s" in composition.' % \
                    obj.__class__.__name__
            dctObjects[obj._id] = obj
        
        # check containment
        composite_type = misc.get_rto_by_name(new_attr.compositeClass)
        
        if [obj for obj in dctObjects.values()
                if not isinstance(obj, composite_type)]:
            raise exceptions.ContainmentError, \
                'Invalid content class "%s" in composition.' % \
                obj.get_contentclass()
        
        # get previous value
        if old_attr != None:
            old_ids = set(old_attr.value)
        else:
            old_ids = set()
        
        new_ids = set([obj._id for obj in new_attr.value])
        
        # calculate added composites
        lstAdded = list(new_ids - old_ids)
        for obj_id in lstAdded:
            _db.handle_update(dctObjects[obj_id], None, trans)
            _db.put_item(dctObjects[obj_id], trans)
        
        # calculate constant composites
        lstConstant = list(new_ids & old_ids)
        for obj_id in lstConstant:
            _db.handle_update(dctObjects[obj_id],
                              _db.get_item(obj_id, trans),
                              trans)
            _db.put_item(dctObjects[obj_id], trans)
        
        # calculate removed composites
        lstRemoved = list(old_ids - new_ids)
        [CompositionEventHandler._removeComposite(_db.get_item(id, trans),
                                                  trans)
         for id in lstRemoved]
                
        new_attr.value = list(new_ids)
    
    @staticmethod
    def on_delete(item, attr, trans, bPermanent):
        if bPermanent:
            [CompositionEventHandler._removeComposite(_db.get_item(id, trans),
                                                      trans)
             for id in attr.value]
        else:
            for sID in attr.value:
                composite = _db.get_item(sID, trans)
                _db.handle_delete(composite, trans, False)
                composite._isDeleted = 1
                _db.put_item(composite, trans)
    
    @staticmethod
    def _removeComposite(composite, trans):
        _db.handle_delete(composite, trans, True)
        _db.delete_item(composite, trans)

class RelatorNEventHandler(DatatypeEventHandler):
    "RelatorN datatype event handler"
    
    @staticmethod
    def on_create(item, attr, trans):
        RelatorNEventHandler.on_update(item, attr, None, trans)
    
    @staticmethod
    def on_update(item, new_attr, old_attr, trans):
        # remove duplicates
        new_attr.value = list(set(new_attr.value))
        
        # get previous value
        if old_attr:
            prvValue = set(old_attr.value)
            noAccessList = RelatorNEventHandler._get_no_access_ids(old_attr,
                                                                   trans)
        else:
            prvValue = set()
            noAccessList = []
        
        # get current value
        currentValue = set(new_attr.value + noAccessList)
        
        if currentValue != prvValue:
            # calculate added references
            ids_added = list(currentValue - prvValue)
            if ids_added:
                RelatorNEventHandler._add_references(new_attr, ids_added,
                                                     item._id, trans)
            # calculate removed references
            ids_removed = list(prvValue - currentValue)
            if ids_removed:
                RelatorNEventHandler._remove_references(new_attr, ids_removed,
                                                        item._id, trans)
    
    @staticmethod
    def on_delete(item, attr, trans, bPermanent):
        if not item._isDeleted:
            if attr.value and attr.respectsReferences:
                raise exceptions.ReferentialIntegrityError, (
                    'Cannot delete object "%s" ' % item.displayName.value +
                    'because it is being referenced by other objects.')
            if attr.cascadeDelete:
                [_db.get_item(id, trans)._recycle(trans)
                 for id in attr.value]
        if bPermanent:
            if attr.cascadeDelete:
                [_db.get_item(id, trans)._delete(trans)
                 for id in attr.value]
            else:
                # remove all references
                RelatorNEventHandler._remove_references(attr, attr.value,
                                                        item._id, trans)
    
    @staticmethod
    def on_undelete(item, attr, trans):
        if attr.cascadeDelete:
            [_db.get_item(id, trans)._undelete(trans)
             for id in attr.value]
    
    @staticmethod
    def _add_references(attr, ids, oid, trans):
        from porcupine.datatypes import Relator1, RelatorN
        for id in ids:
            ref_item = _db.get_item(id, trans)
            if ref_item != None and isinstance(ref_item,
                                               tuple([misc.get_rto_by_name(cc)
                                                      for cc in attr.relCc])):
                ref_attr = getattr(ref_item, attr.relAttr)
                if isinstance(ref_attr, RelatorN):
                    ref_attr.value.append(oid)
                elif isinstance(ref_attr, Relator1):
                    ref_attr.value = oid
                ref_attr.validate()
                _db.put_item(ref_item, trans)
            else:
                attr.value.remove(id)
    
    @staticmethod
    def _remove_references(attr, ids, oid, trans):
        # remove references
        from porcupine.datatypes import Relator1, RelatorN
        for id in ids:
            ref_item = _db.get_item(id, trans)
            ref_attr = getattr(ref_item, attr.relAttr)
            if isinstance(ref_attr, RelatorN):
                try:
                    ref_attr.value.remove(oid)
                except ValueError:
                    pass
            elif isinstance(ref_attr, Relator1):
                ref_attr.value = ''
            ref_attr.validate()
            _db.put_item(ref_item, trans)
    
    @staticmethod
    def _get_no_access_ids(attr, trans):
        ids = [id for id in attr.value
               if db.get_item(id, trans) == None]
        return ids
    
class Relator1EventHandler(DatatypeEventHandler):
    "Relator1 datatype event handler"

    @staticmethod
    def on_create(item, attr, trans):
        Relator1EventHandler.on_update(item, attr, None, trans)
 
    @staticmethod
    def on_update(item, new_attr, old_attr, trans):
        # get previous value
        if old_attr:
            prvValue = old_attr.value
        else:
            prvValue = ''
        
        if new_attr.value != prvValue:
            if new_attr.value:
                Relator1EventHandler._add_reference(new_attr, item._id, trans)
            if old_attr and prvValue:
                # remove old reference
                Relator1EventHandler._remove_reference(old_attr, item._id,
                                                       trans)
    
    @staticmethod
    def on_delete(item, attr, trans, bPermanent):
        if not item._isDeleted:
            if attr.value and attr.respectsReferences:
                raise exceptions.ReferentialIntegrityError, (
                    'Cannot delete object "%s" ' % item.displayName.value +
                    'because it is referenced by other objects.')
            if attr.cascadeDelete:
                _db.get_item(attr.value, trans)._recycle(trans)
        if bPermanent and attr.value:
            if attr.cascadeDelete:
                _db.get_item(attr.value, trans)._delete(trans)
            else:
                # remove reference
                Relator1EventHandler._remove_reference(attr, item._id, trans)
    
    @staticmethod
    def on_undelete(item, attr, trans):
        if attr.cascadeDelete:
            _db.get_item(attr.value, trans)._undelete(trans)
    
    @staticmethod
    def _add_reference(attr, oid, trans):
        from porcupine.datatypes import Relator1, RelatorN
        ref_item = _db.get_item(attr.value, trans)
        if ref_item != None and isinstance(ref_item,
                                           tuple([misc.get_rto_by_name(cc)
                                                  for cc in attr.relCc])):
            ref_attr = getattr(ref_item, attr.relAttr)
            if isinstance(ref_attr, RelatorN):
                ref_attr.value.append(oid)
            elif isinstance(ref_attr, Relator1):
                ref_attr.value = oid
            ref_attr.validate()
            _db.put_item(ref_item, trans)
        else:
            attr.value = None
    
    @staticmethod
    def _remove_reference(attr, oid, trans):
        from porcupine.datatypes import Relator1, RelatorN
        ref_item = _db.get_item(attr.value, trans)
        ref_attr = getattr(ref_item, attr.relAttr)
        if isinstance(ref_attr, RelatorN):
            try:
                ref_attr.value.remove(oid)
            except ValueError:
                pass
        elif isinstance(ref_attr, Relator1):
            ref_attr.value = None
        ref_attr.validate()
        _db.put_item(ref_item, trans)

class ExternalAttributeEventHandler(DatatypeEventHandler):
    "External attribute event handler"

    @staticmethod
    def on_create(item, attr, trans):
        ExternalAttributeEventHandler.on_update(item, attr, None, trans)
    
    @staticmethod
    def on_update(item, new_attr, old_attr, trans):
        if new_attr.is_dirty:
            _db.put_external(new_attr._id, new_attr.value, trans)
        new_attr._reset()
    
    @staticmethod
    def on_delete(item, attr, trans, bPermanent):
        if bPermanent:
            _db.delete_external(attr._id, trans)

class ExternalFileEventHandler(DatatypeEventHandler):
    "External file event handler"
    
    @staticmethod
    def on_delete(item, attr, trans, bPermanent):
        if bPermanent and attr.removeFileOnDeletion:
            try:
                os.remove(attr.value)
            except OSError:
                pass
