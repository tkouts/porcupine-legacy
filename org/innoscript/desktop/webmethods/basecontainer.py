#==============================================================================
#   Copyright (c) 2005-2010, Tassos Koutsovassilis
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
Porcupine Desktop web methods for the base container content type
=================================================================

Generic interfaces applying to all container types unless overridden.
"""

import os

from porcupine import db
from porcupine import context
from porcupine import webmethods
from porcupine import filters
from porcupine import datatypes

from porcupine.systemObjects import Container
from porcupine.oql import command
from porcupine.utils import date, misc, permsresolver

from org.innoscript.desktop.strings import resources
from org.innoscript.desktop.webmethods import baseitem


@filters.etag()
@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=Container,
                   template='../ui.ContainerList.quix')
def list(self):
    "Displays the container's window"
    return {
        'ID': self.id,
        'PARENT_ID': self.parentid}


@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=Container,
                   template='../ui.Frm_AutoNew.quix',
                   max_age=120,
                   template_engine='normal_template')
def new(self):
    "Displays a generic form for creating a new object"
    sCC = context.request.queryString['cc'][0]
    oNewItem = misc.get_rto_by_name(sCC)()
    role = permsresolver.get_access(self, context.user)

    params = {
        'CC': sCC,
        'URI': self.id,
        'TITLE': '@@CREATE@@ &quot;@@%s@@&quot;' % sCC,
        'ICON': oNewItem.__image__,
        'PROPERTIES': [],
        'EXTRA_TABS': [],
        'ADMIN': role == permsresolver.COORDINATOR,
        'ROLES_INHERITED': 'true',
        'ACTION_DISABLED': 'false',
        'METHOD': 'create'}

    # inspect item properties
    for attr_name in oNewItem.__props__:
        attr = getattr(oNewItem, attr_name)
        if isinstance(attr, datatypes.DataType):
            control, tab = baseitem._getControlFromAttribute(oNewItem,
                                                             attr_name,
                                                             attr,
                                                             False,
                                                             True)
            params['PROPERTIES'].append(control)
            params['EXTRA_TABS'].append(tab)

    return params


@webmethods.remotemethod(of_type=Container)
@db.transactional(auto_commit=True)
def create(self, data):
    "Creates a new item"
    oNewItem = misc.get_rto_by_name(data.pop('CC'))()

    # get user role
    iUserRole = permsresolver.get_access(self, context.user)
    if '__rolesinherited' in data and iUserRole == permsresolver.COORDINATOR:
        oNewItem.inheritRoles = data.pop('__rolesinherited')
        if not oNewItem.inheritRoles:
            acl = data.pop('__acl')
            if acl:
                security = {}
                for descriptor in acl:
                    security[descriptor['id']] = int(descriptor['role'])
                oNewItem.security = security

    # set props
    for prop in data:
        oAttr = getattr(oNewItem, prop)
        if isinstance(oAttr, datatypes.File):
            if data[prop]['tempfile']:
                oAttr.filename = data[prop]['filename']
                sPath = (context.server.temp_folder + '/' +
                         data[prop]['tempfile'])
                oAttr.load_from_file(sPath)
                os.remove(sPath)
        elif isinstance(oAttr, datatypes.Date):
            oAttr.value = data[prop].value
        elif isinstance(oAttr, datatypes.Integer):
            oAttr.value = int(data[prop])
        else:
            oAttr.value = data[prop]

    oNewItem.append_to(self)
    return oNewItem.id


@filters.etag()
@webmethods.remotemethod(of_type=Container)
def getInfo(self):
    "Returns info about the container's contents"
    sLang = context.request.get_lang()
    lstChildren = []
    children = self.get_children()
    for child in children:
        obj = {
            'id': child.id,
            'cc': child.contentclass,
            'image': child.__image__,
            'displayName': child.displayName.value,
            'isCollection': child.isCollection,
            'modified': date.Date(child.modified)}
        if hasattr(child, 'size'):
            obj['size'] = child.size
        lstChildren.append(obj)

    containment = []
    for contained in self.containment:
        image = misc.get_rto_by_name(contained).__image__
        if not type(image) == str:
            image = ''
        localestring = resources.get_resource(contained, sLang)
        containment.append([localestring, contained, image])

    return {
        'displayName': self.displayName.value,
        'path': misc.get_full_path(self),
        'parentid': self.parentid,
        'iscollection': self.isCollection,
        'containment': containment,
        'user_role': permsresolver.get_access(self, context.user),
        'contents': lstChildren}


@filters.etag()
@webmethods.remotemethod(of_type=Container)
def getSubtree(self):
    l = []
    folders = self.get_subfolders()
    for folder in folders:
        o = {'id': folder.id,
             'caption': folder.displayName.value,
             'img': folder.__image__,
             'haschildren': folder.has_subfolders()}
        l.append(o)
    return l


@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=Container,
                   template='../ui.Dlg_SelectObjects.quix')
def selectobjects(self):
    "Displays the select objects dialog"
    sCC = context.request.queryString['cc'][0]
    params = {'ID': self.id or '/',
              'IMG': self.__image__,
              'DN': self.displayName.value,
              'HAS_SUBFOLDERS': str(self.has_subfolders()).lower(),
              'MULTIPLE': context.request.queryString['multiple'][0],
              'CC': sCC}

    sOql = "select * from $SCOPE"
    if sCC != '*':
        ccs = sCC.split('|')
        ccs = ["instanceof('%s')" % x for x in ccs]
        sConditions = " or ".join(ccs)
        sOql += " where %s" % sConditions
    oRes = command.execute(sOql, {'SCOPE': self.id})

    sOptions = ''
    for obj in oRes:
        sOptions += '<option img="%s" value="%s" caption="%s"/>' % (
                    obj.__image__, obj.id, obj.displayName.value)
    params['OPTIONS'] = sOptions
    return params
