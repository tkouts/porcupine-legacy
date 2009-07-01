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
Porcupine Desktop web methods for base item content types
=========================================================

Generic interfaces applying to all content classes
unless overriden.
"""
from porcupine import db
from porcupine import context
from porcupine import webmethods
from porcupine import filters
from porcupine import datatypes

from porcupine.systemObjects import Item
from porcupine.systemObjects import GenericItem
from porcupine.utils import date, xml, permsresolver

AUTO_CONTROLS = {
    datatypes.String: '''
        <rect height="24">
            <label width="100" height="20" caption="%s:"/>
            <field name="%s" left="105"
                width="this.parent.getWidth()-105" value="%s" readonly="%s"/>
        </rect>
        ''',
    datatypes.Boolean: '''
        <rect height="24">
            <label width="100" height="20" caption="%s:"/>
            <field type="checkbox" name="%s" left="105" value="%s"
                readonly="%s"/>
        </rect>
        ''',
    datatypes.File: '''
        <rect height="24">
            <label width="100" height="20" caption="%s:"/>
            <file name="%s" filename="%s" size="%d" href="%s" left="105"
                readonly="%s"/>
        </rect>
        ''',
    datatypes.Text: '''
        <tab caption="%s">
                <field type="textarea" name="%s" width="100%%" height="100%%"
                    readonly="%s">%s</field>
        </tab>
        ''',
    datatypes.Date: '''
        <rect height="24">
            <label width="100" height="20" caption="%s:"/>
            <datepicker name="%s" left="105" width="140" value="%s"
                readonly="%s"/>
        </rect>
        ''',
    datatypes.Reference1: '''
        <rect height="24">
            <custom classname="Reference1" width="100%%"
                root="" cc="%s" caption="%s" name="%s" value="%s" dn="%s"
                disabled="%s"/>
        </rect>
        ''',
    datatypes.ReferenceN: '''
        <tab caption="%s">
            <custom classname="ReferenceN" width="100%%" height="100%%"
                root="" cc="%s" name="%s" disabled="%s" value="%s"/>
        </tab>
        '''
}

SECURITY_TAB = '''
<tab caption="@@SECURITY@@" onactivate="generic.getSecurity">
    <custom classname="ACLEditor" width="100%%" height="100%%"
        rolesinherited="%s"/>
</tab>
'''

DATES_FORMAT = 'ddd, dd month yyyy h12:min:sec MM'

def _getSecurity(forItem, user, rolesInherited=None):
    # get user role
    iUserRole = permsresolver.get_access(forItem, user)
    if iUserRole == permsresolver.COORDINATOR:
        rolesInherited = rolesInherited or forItem.inheritRoles
        return SECURITY_TAB % str(rolesInherited).lower()
    else:
        return ''
    
def _getControlFromAttribute(item, attrname, attr, readonly, isNew=False):
    attrlabel = '@@%s@@' % attrname
    sControl = ''
    sTab = ''
    
    if isinstance(attr, datatypes.String):
        sControl = AUTO_CONTROLS[datatypes.String] % \
            (attrlabel, attrname,
             xml.xml_encode(attr.value), str(readonly).lower())

    elif isinstance(attr, datatypes.Boolean):
        sControl = AUTO_CONTROLS[datatypes.Boolean] % \
            (attrlabel, attrname,
             str(attr.value).lower(),
             str(readonly).lower())
        
    elif isinstance(attr, datatypes.Date):
        sControl = AUTO_CONTROLS[datatypes.Date] % \
            (attrlabel, attrname,
             attr.to_iso_8601(), str(readonly).lower())
        
    elif isinstance(attr, datatypes.File):
        if isNew:
            href = ''
        else:
            href = item.id + '?cmd=getfile'
        sControl = AUTO_CONTROLS[datatypes.File] % (
            attrlabel, attrname,
            attr.filename, len(attr), href,
            str(readonly).lower()
        )
        
    elif isinstance(attr, datatypes.Text):
        sTab = AUTO_CONTROLS[datatypes.Text] % (
            attrlabel, attrname, str(readonly).lower(),
            xml.xml_encode(attr.value)
        )
        
    elif isinstance(attr, datatypes.Reference1):
        oRefItem = attr.get_item()
        if oRefItem:
            refid = oRefItem.id
            refname = oRefItem.displayName.value
        else:
            refid = refname = ''
        sReadonly = str(readonly).lower()
        sControl = AUTO_CONTROLS[datatypes.Reference1] % (
            '|'.join(attr.relCc),
            attrlabel,
            attrname,
            refid,
            refname,
            sReadonly
        )
        
    elif isinstance(attr, datatypes.ReferenceN):
        options = []
        rel_items = attr.get_items()
        for item in rel_items:
            options += [xml.xml_encode(item.__image__),
                        item.id,
                        xml.xml_encode(item.displayName.value)]
        
        sTab = AUTO_CONTROLS[datatypes.ReferenceN] % (
            attrlabel,
            '|'.join(attr.relCc),
            attrname,
            str(readonly).lower(),
            ';'.join(options)
        )
    
    return (sControl, sTab)

@filters.etag()
@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=Item,
                   max_age=-1,
                   template='../ui.Frm_AutoProperties.quix')
def properties(self):
    "Displays a generic edit form based on the object's schema"
    sLang = context.request.get_lang()
    
    user = context.user
    iUserRole = permsresolver.get_access(self, user)
    readonly = (iUserRole==1)
    modified = date.Date(self.modified)
    
    params = {
        'ID': self.id,
        'ICON': self.__image__,
        'NAME': xml.xml_encode(self.displayName.value),
        'MODIFIED': modified.format(DATES_FORMAT, sLang),
        'MODIFIED_BY': xml.xml_encode(self.modifiedBy),
        'CONTENTCLASS': self.contentclass,
        'PROPERTIES_TAB': '',
        'EXTRA_TABS': '',
        'SECURITY_TAB': _getSecurity(self, context.user),
        'UPDATE_DISABLED': str(readonly).lower()
    }
    # inspect item properties
    sProperties = ''
    for attr_name in self.__props__:
        attr = getattr(self, attr_name)
        if isinstance(attr, datatypes.DataType):
            control, tab = \
                _getControlFromAttribute(self, attr_name, attr, readonly)
            sProperties += control
            params['EXTRA_TABS'] += tab
    
    params['PROPERTIES'] = sProperties
    return params

@filters.etag()
@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=Item,
                   max_age=-1,
                   template='../ui.Dlg_Rename.quix')
def rename(self):
    "Displays the rename dialog"
    return {
        'TITLE': self.displayName.value,
        'ID': self.id,
        'DN': self.displayName.value,
    }

@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=GenericItem,
                   max_age=3600,
                   template='../ui.Dlg_SelectContainer.quix') 
def selectcontainer(self):
    "Displays a dialog for selecting the destination container"
    rootFolder = db.get_item('')
    params = {
        'ROOT_ID': '/',
        'ROOT_IMG': rootFolder.__image__,
        'ROOT_DN': rootFolder.displayName.value,
        'ID': self.id,
    }
    sAction = context.request.queryString['action'][0]
    params['TITLE'] = '@@%s@@' % sAction.upper()
    if sAction != 'select_folder':
        params['TITLE'] += ' &quot;%s&quot;' % self.displayName.value
    return params


@webmethods.remotemethod(of_type=Item)
@db.transactional(auto_commit=True)
def update(self, data):
    "Updates an object based on values contained inside the data dictionary"
    # get user role
    iUserRole = permsresolver.get_access(self, context.user)
    if data.has_key('__rolesinherited') and \
            iUserRole == permsresolver.COORDINATOR:
        self.inheritRoles = data.pop('__rolesinherited')
        if not self.inheritRoles:
            acl = data.pop('__acl')
            if acl:
                security = {}
                for descriptor in acl:
                    security[descriptor['id']] = int(descriptor['role'])
                self.security = security

    for prop in data:
        oAttr = getattr(self, prop)
        if isinstance(oAttr, datatypes.File):
            # see if the user has uploaded a new file
            if data[prop]['tempfile']:
                oAttr.filename = data[prop]['filename']
                sPath = context.server.temp_folder + '/' + data[prop]['tempfile']
                oAttr.load_from_file(sPath)
        elif isinstance(oAttr, datatypes.Date):
            oAttr.value = data[prop].value
        elif isinstance(oAttr, datatypes.Integer):
            oAttr.value = int(data[prop])
        else:
            oAttr.value = data[prop]
    self.update()
    return True

@webmethods.remotemethod(of_type=Item)
@db.transactional(auto_commit=True)
def rename(self, newName):
    "Changes the display name of an object"
    self.displayName.value = newName
    self.update()
    return True

@filters.etag()
@webmethods.remotemethod(of_type=Item)
def getSecurity(self):
    "Returns information about the object's security descriptor"
    l = []
    for sID in self.security:
        oUser = db.get_item(sID)
        if oUser != None:
            dn = oUser.displayName.value
        else:
            dn = sID
        l.append({
            'id': sID,
            'displayName': dn,
            'role': str(self.security[sID])
        })
    return l

@webmethods.remotemethod(of_type=Item)
@db.transactional(auto_commit=True)
def copyTo(self, targetid):
    self.copy_to(targetid)
    return True

@webmethods.remotemethod(of_type=Item)
@db.transactional(auto_commit=True)
def moveTo(self, targetid):
    self.move_to(targetid)
    return True

@webmethods.remotemethod(of_type=GenericItem)
@db.transactional(auto_commit=True)
def delete(self):
    self.recycle('rb')
    return True

@webmethods.remotemethod(of_type=GenericItem)
@db.transactional(auto_commit=True)
def deletePermanent(self):
    self.delete()
    return True
