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
Helper module for resolving object permissions
"""

# 1 - read
# 2 - update, delete if owner
# 4 - update, delete anyway
# 8 - full control
NO_ACCESS = 0
READER = 1
AUTHOR = 2
CONTENT_CO = 4
COORDINATOR = 8


def get_access(item, user):
    if user.is_admin():
        return COORDINATOR
    member_of = ['everyone']
    userid = user._id
    member_of.extend(user.memberof.value)
    if hasattr(user, 'authenticate'):
        member_of.extend(['authusers'])
    try:
        perm = item.security[userid]
        # user explicitly set on ACL
        return perm
    except KeyError:
        pass
    perms = [item.security.get(groupid, 0) for groupid in member_of] or [0]
    return max(perms)
