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
"Porcupine desktop security objects"
import hashlib

from porcupine import datatypes
from porcupine import systemObjects as system
from porcupine.core.compat import str

from org.innoscript.desktop.schema import properties
from org.innoscript.desktop.schema import handlers


class PoliciesFolder(system.Container):
    """
    Server Policies Folder
    ======================
    A container type for all the security policies
    """
    __image__ = "desktop/images/policies.gif"
    containment = ('org.innoscript.desktop.schema.security.Policy', )


class Policy(system.Item):
    """
    Server Policy
    =============
    Policy is a way for securing web methods.
    Policies take precedence over security descriptors.

    They are extremely usefull when a remote method is required
    to be accessed by acertain group of users. Sample usage::

        from porcupine import filters
        from porcupine import webmethods

        @filters.requires_policy(my_policy_object_id)
        @webmethods.remotemethod(of_type=MyContentClass)
        def myMethod(self):
                ...

    The C{myMethod} method is secured by the policy with ID
    C{my_policy_object_id}. Only the users and groups that have been
    granted this policy can execute this remote method.

    If a non-authorized user calls C{myMethod} a
    L{PermissionDenied<porcupine.exceptions.PermissionDenied>}
    exception is raised.

    @ivar policyGranted: The list of users that have been granted this policy.
    @type policyGranted:
      L{PolicyGranted<org.innoscript.desktop.schema.properties.PolicyGranted>}
    """
    __image__ = "desktop/images/policy.gif"
    __props__ = dict({'policyGranted': properties.PolicyGranted},
                     **system.Item.__props__)


class UsersFolder(system.Container):
    """
    Users Folder
    ============
    This is the container of all users and groups.
    """
    __image__ = "desktop/images/userfolder.gif"
    containment = ('org.innoscript.desktop.schema.security.User',
                   'org.innoscript.desktop.schema.security.Group')


class GenericUser(system.Item):
    """Generic User object

    @ivar fullName: The user's full name.
    @type fullName: L{String<porcupine.datatypes.String>}

    @ivar memberof: The list of groups that this user belongs to.
    @type memberof:
        L{MemberOf<org.innoscript.desktop.schema.properties.MemberOf>}

    @ivar policies: The list of policies assigned to this user.
    @type policies:
        L{Policies<org.innoscript.desktop.schema.properties.Policies>}
    """
    __image__ = "desktop/images/user.gif"
    __props__ = dict({'fullName': datatypes.String,
                      'memberof': properties.MemberOf,
                      'policies': properties.Policies},
                     **system.Item.__props__)

    def is_member_of(self, group):
        """
        Checks if the user is member of the given group.

        @param group: the group object
        @type group: L{GenericGroup}

        @rtype: bool
        """
        return group.id in self.memberof.value

    def is_admin(self):
        """
        Checks if the user is member of the administrators group.

        @rtype: bool
        """
        return 'administrators' in self.memberof.value


class User(GenericUser):
    """Porcupine User object

    @ivar password: The user's password.
    @type password: L{RequiredPassword<porcupine.datatypes.RequiredPassword>}

    @ivar email: The user's email.
    @type email: L{String<porcupine.datatypes.String>}

    @ivar settings: User specific preferences.
    @type settings: L{Dictionary<porcupine.datatypes.Dictionary>}
    """
    __props__ = dict({'password': datatypes.RequiredPassword,
                      'email': datatypes.String,
                      'settings': datatypes.Dictionary,
                      'personalFolder': datatypes.Reference1},
                     **GenericUser.__props__)
    _eventHandlers = (GenericUser._eventHandlers +
                      [handlers.PersonalFolderHandler])

    def authenticate(self, password):
        """Checks if the given string matches the
        user's password.

        @param password: The string to check against.
        @type password: str

        @rtype: bool
        """
        if type(password) == str:
            password = password.encode('utf-8')
        md = hashlib.md5(password)
        hex_digest = md.hexdigest().encode()
        return hex_digest == self.password.value


class SystemUser(system.Item):
    """
    System User
    ===========
    System User is a special user. Its instance is retreived when the
    L{BaseServlet.runAsSystem<porcupine.core.servlet.BaseServlet.runAsSystem>}
    method is called.
    """
    __image__ = "desktop/images/user.gif"

    def is_admin(self):
        """
        System User is an administative account.

        @return: C{True}
        """
        return True


class GuestUser(GenericUser):
    """
    Guest User
    ==========
    This user instance is assigned by the session manager
    to all new sessions.
    This is configurable. See the C{sessionmanager} section
    of C{porcupine.conf}.
    """


class GenericGroup(system.Item):
    """Generic Group class

    @ivar policies: The list of policies have been asigned to this group.
    @type policies:
        L{Policies<org.innoscript.desktop.schema.properties.Policies>}
    """
    __image__ = "desktop/images/group.gif"
    __props__ = dict({'policies': properties.Policies},
                     **system.Item.__props__)

    def has_member(self, user):
        """
        Not Implemented.
        It must be implemented by subclasses.
        """
        raise NotImplementedError


class Group(GenericGroup):
    """Porcupine Group

    @ivar members: The group's members.
    @type members: L{Members<org.innoscript.desktop.schema.properties.Members>}
    """
    __props__ = dict({'members': properties.Members},
                     **GenericGroup.__props__)

    def has_member(self, user):
        """
        Checks if a user belongs is in this group.

        @param user: the user object
        @type user: L{GenericUser}

        @rtype: bool
        """
        return user.id in self.members.value


class EveryoneGroup(GenericGroup):
    "Everyone Group"

    def has_member(self, user):
        """
        This method always returns C{True}.

        @param user: the user object
        @type user: L{GenericUser}

        @return: C{True}
        @rtype: bool
        """
        return True


class AuthUsersGroup(GenericGroup):
    "Authenticated Users Group"

    def has_member(self, user):
        """
        This method returns C{True} only if the user object has
        an attribute named C{password} else it returns C{False}.

        @param user: the user object
        @type user: L{GenericUser}

        @rtype: bool
        """
        return hasattr(user, 'password')
