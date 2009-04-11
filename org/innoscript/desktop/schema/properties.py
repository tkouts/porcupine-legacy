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
This module defines all the custom properties used
by the L{org.innoscript.desktop.schema} module custom objects.
"""
from porcupine.datatypes import RelatorN

class CategoryObjects(RelatorN):
    """
    The objects that a category has.
    
    Added in:
        1. L{Category<org.innoscript.desktop.schema.common.Category>}
    """
    relCc = (
        'org.innoscript.desktop.schema.common.Document', 
        'org.innoscript.desktop.schema.collab.Contact', 
    )
    relAttr = 'categories'
    
class Categories(RelatorN):
    """
    The categories that an object belongs to.
    
    Added in:
        1. L{Document<org.innoscript.desktop.schema.common.Document>}
        2. L{Contact<org.innoscript.desktop.schema.collab.Contact>}
    """
    relCc = (
        'org.innoscript.desktop.schema.common.Category',
    )
    relAttr = 'category_objects'
        
class MemberOf(RelatorN):
    """
    The groups that a user is member of.
    
    Added in:
        1. L{GenericUser<org.innoscript.desktop.schema.security.GenericUser>}
    """
    relCc = ('org.innoscript.desktop.schema.security.Group', )
    relAttr = 'members'

class Members(RelatorN):
    """
    A group's members.
    
    Added in:
        1. L{Group<org.innoscript.desktop.schema.security.Group>}
    """
    relCc = (
        'org.innoscript.desktop.schema.security.GenericUser',
    )
    relAttr = 'memberof'
    
class Policies(RelatorN):
    """
    List of policies assigned to an object.
    
    Added in:
        1. L{GuestUser<org.innoscript.desktop.schema.security.GenericUser>}
        2. L{Group<org.innoscript.desktop.schema.security.GenericGroup>}
    """
    relCc = ('org.innoscript.desktop.schema.security.Policy', )
    relAttr = 'policyGranted'

class PolicyGranted(RelatorN):
    """
    List of objects that a policy is assigned to.
    
    Added in:
        1. L{Policy<org.innoscript.desktop.schema.security.Policy>}
    """
    relCc = (
        'org.innoscript.desktop.schema.security.GenericUser',
        'org.innoscript.desktop.schema.security.GenericGroup'
    )
    relAttr = 'policies'
