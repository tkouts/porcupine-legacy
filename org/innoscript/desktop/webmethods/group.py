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
Web methods for the group content class
"""
from porcupine import context
from porcupine import webmethods
from porcupine import filters
from porcupine.utils import date, xml, permsresolver

from org.innoscript.desktop.schema.security import Group
from org.innoscript.desktop.webmethods import baseitem

@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=Group,
                   max_age=-1,
                   template='../ui.Frm_GroupProperties.quix')
def properties(self):
    "Displays the group's properties form"
    sLang = context.request.get_lang()

    user = context.user
    iUserRole = permsresolver.get_access(self, user)
    readonly = (iUserRole==1)

    params = {
        'ID' : self.id,
        'ICON' : self.__image__,
        'SELECT_FROM_POLICIES' : 'policies',
        'POLICIES_REL_CC' : '|'.join(self.policies.relCc),
        'NAME' : xml.xml_encode(self.displayName.value),
        'DESCRIPTION' : xml.xml_encode(self.description.value),
        'MODIFIED' : date.Date(self.modified).format(baseitem.DATES_FORMAT, sLang),
        'MODIFIED_BY' : xml.xml_encode(self.modifiedBy),
        'CONTENTCLASS' : self.contentclass,
        'SELECT_FROM' : self.parentid,
        'REL_CC' : '|'.join(self.members.relCc),
        'READONLY' : str(readonly).lower()
    }

    members_options = []
    members = self.members.get_items()
    for user in members:
        members_options += [xml.xml_encode(user.__image__),
                            user.id,
                            xml.xml_encode(user.displayName.value)]
    params['MEMBERS'] = ';'.join(members_options)

    policies_options = []
    policies = self.policies.get_items()
    for policy in policies:
        policies_options += [xml.xml_encode(policy.__image__),
                             policy.id,
                             xml.xml_encode(policy.displayName.value)]
    params['POLICIES'] = ';'.join(policies_options)
    
    params['SECURITY_TAB'] = baseitem._getSecurity(self, user)
    
    return params

