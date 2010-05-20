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
"Porcupine database utilities used by the system"
import sys
import struct
import time

from porcupine import db
from porcupine import context
from porcupine.administration import offlinedb
from porcupine.core.compat import str
from porcupine.utils.date import Date

_err_unsupported_index_type = -2334


def pack_value(value):
    """
    Packs Python values to C structs used for indexed lookups.
    Currently supported types include unicode strings, bytes, booleans,
    floats and integers.
    """
    if isinstance(value, str):
        value = value.encode('utf-8')
    elif isinstance(value, Date):
        value = value.value

    packed = None
    if type(value) == bytes:
        packed = struct.pack('%ds' % len(value), value)
    elif type(value) == bool:
        packed = struct.pack('c', chr(int(value)))
    elif type(value) == int:
        packed = struct.pack('>l', value)
    elif type(value) == float:
        packed = struct.pack('>d', value)
    elif value is None:
        packed = struct.pack('c', chr(0))
    else:
        # unsupported data type
        packed = _err_unsupported_index_type
    return packed


def str_long(s, padding=16):
    """
    Used by bdb range cursors to provide an approximate cursor sizing
    """
    if len(s) < padding:
        s += b'\x00' * (padding - len(s))
    chars = [c for c in s[:padding]]
    chars.reverse()
    long = 0
    for i, c in enumerate(chars):
        # python2.6
        if not isinstance(c, int):
            c = ord(c)
        long += c * (2 ** i)
    return long


@db.transactional(auto_commit=True)
def initialize_db():
    "Initializes the Porcupine database."
    import org.innoscript.desktop.schema.common
    import org.innoscript.desktop.schema.security

    db_handle = offlinedb.get_handle()

    # truncate database
    sys.stdout.write('Deleting existing database...')
    db_handle.truncate()
    sys.stdout.write('[OK]\n')

    # modify containment at run-time
    org.innoscript.desktop.schema.common.RootFolder.containment = (
        'org.innoscript.desktop.schema.common.Category',
        'org.innoscript.desktop.schema.common.PersonalFolders',
        'org.innoscript.desktop.schema.common.AdminTools')
    org.innoscript.desktop.schema.common.AdminTools.containment = (
        'org.innoscript.desktop.schema.security.UsersFolder',
        'org.innoscript.desktop.schema.security.PoliciesFolder',
        'org.innoscript.desktop.schema.common.AppsFolder')
    org.innoscript.desktop.schema.security.UsersFolder.containment = (
        list(org.innoscript.desktop.schema.security.UsersFolder.containment) + 
        ['org.innoscript.desktop.schema.security.SystemUser',
         'org.innoscript.desktop.schema.security.GuestUser',
         'org.innoscript.desktop.schema.security.EveryoneGroup',
         'org.innoscript.desktop.schema.security.AuthUsersGroup'])

    # create top level objects
    sOwner = 'SYSTEM'
    ftime = time.time()

    sys.stdout.write('Creating root folder...')
    rootFolder = org.innoscript.desktop.schema.common.RootFolder()
    rootFolder._id = ''
    rootFolder.description.value = 'Root Folder'
    rootFolder.displayName.value = 'Porcupine Server'
    rootFolder._isSystem = True
    rootFolder._owner = sOwner
    rootFolder.modifiedBy = sOwner
    rootFolder._created = ftime
    rootFolder.modified = ftime
    rootFolder.security = {'everyone': 1, 'administrators': 8}
    db_handle.put_item(rootFolder)
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating recycle bin...')
    rb = org.innoscript.desktop.schema.common.RecycleBin()
    rb._id = 'rb'
    rb.description.value = 'Deleted items container'
    rb.displayName.value = 'Recycle Bin'
    rb._isSystem = True
    rb._owner = sOwner
    rb.modifiedBy = sOwner
    rb._created = ftime
    rb.modified = ftime
    rb.inheritRoles = False
    rb.security = {'administrators': 8}
    db_handle.put_item(rb)
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Categories folder...')
    catFolder = org.innoscript.desktop.schema.common.Category()
    catFolder._id = 'categories'
    catFolder.displayName.value = 'Categories'
    catFolder._isSystem = True
    catFolder.append_to('')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating container for users\' personal storage...')
    perFolder = org.innoscript.desktop.schema.common.PersonalFolders()
    perFolder._id = 'personal'
    perFolder.displayName.value = 'Personal folders'
    perFolder._isSystem = True
    perFolder.append_to('')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating admin\'s personal storage...')
    adminFolder = org.innoscript.desktop.schema.common.PersonalFolder()
    adminFolder._id = 'adminstorage'
    adminFolder.displayName.value = 'admin'
    adminFolder._isSystem = True
    adminFolder.inheritRoles = False
    adminFolder.security = {'admin': 2, 'administrators': 8}
    adminFolder.append_to('personal')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Administrative Tools folder...')
    adminFolder = org.innoscript.desktop.schema.common.AdminTools()
    adminFolder._id = 'admintools'
    adminFolder.displayName.value = 'Administrative Tools'
    adminFolder._isSystem = True
    adminFolder.inheritRoles = False
    adminFolder.security = {'administrators': 8}
    adminFolder.append_to('')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Users folder...')
    userFolder = org.innoscript.desktop.schema.security.UsersFolder()
    userFolder._id = 'users'
    userFolder.displayName.value = 'Users and Groups'
    userFolder._isSystem = True
    userFolder.inheritRoles = False
    userFolder.security = {'authusers': 1, 'administrators': 8}
    userFolder.description.value = 'Users and Groups container'
    userFolder.append_to('admintools')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Admin user...')
    admin = org.innoscript.desktop.schema.security.User()
    admin._id = 'admin'
    admin.displayName.value = 'admin'
    admin.personalFolder.value = 'adminstorage'
    admin._isSystem = True
    admin.description.value = 'Administrator account'
    admin.password.value = 'admin'
    admin.settings.value = {'TASK_BAR_POS': 'bottom'}
    admin.append_to('users')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating SYSTEM user...')
    context.user.append_to('users')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating GUEST user...')
    guest = org.innoscript.desktop.schema.security.GuestUser()
    guest._id = 'guest'
    guest.displayName.value = 'GUEST'
    guest._isSystem = True
    guest.description.value = 'Guest account'
    guest.inheritRoles = False
    guest.security = {'everyone': 1, 'administrators': 8}
    guest.append_to('users')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Everyone group...')
    everyone = org.innoscript.desktop.schema.security.EveryoneGroup()
    everyone._id = 'everyone'
    everyone.displayName.value = 'Everyone'
    everyone._isSystem = True
    everyone.description.value = 'Everyone group'
    everyone.append_to('users')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Authenticated Users group...')
    auth = org.innoscript.desktop.schema.security.AuthUsersGroup()
    auth._id = 'authusers'
    auth.displayName.value = 'Authenticated Users'
    auth._isSystem = True
    auth.description.value = 'Authenticated Users group'
    auth.append_to('users')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Administrators Group...')
    admins = org.innoscript.desktop.schema.security.Group()
    admins._id = 'administrators'
    admins.displayName.value = 'Administrators'
    admins._isSystem = True
    admins.members.value = ['admin']
    admins.description.value = 'Administrators group'
    admins.append_to('users')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Server Policies folder...')
    polFolder = org.innoscript.desktop.schema.security.PoliciesFolder()
    polFolder._id = 'policies'
    polFolder.displayName.value = 'Policies'
    polFolder._isSystem = True
    polFolder.description.value = 'Server Security Policies '
    polFolder.append_to('admintools')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Upload Policy...')
    policy = org.innoscript.desktop.schema.security.Policy()
    policy._id = 'uploadpolicy'
    policy.displayName.value = 'Upload Documents'
    policy._isSystem = True
    policy.policyGranted.value = ['authusers']
    policy.description.value = \
        'Policy for uploading documents to server temporary folder'
    policy.append_to('policies')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating QuiX Applications folder...')
    appFolder = org.innoscript.desktop.schema.common.AppsFolder()
    appFolder._id = 'apps'
    appFolder.displayName.value = 'Applications'
    appFolder._isSystem = True
    appFolder.inheritRoles = False
    appFolder.security = {'authusers': 1, 'administrators': 8}
    appFolder.description.value = 'Installed applications container'
    appFolder.append_to('admintools')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating Users and Groups Management application...')
    app = org.innoscript.desktop.schema.common.Application()
    app._id = 'appusrmgmnt'
    app.displayName.value = 'Users and Groups Management'
    app._isSystem = True
    app.launchUrl.value = 'usermgmnt/usermgmnt.quix'
    app.icon.value = 'usermgmnt/images/icon.gif'
    app.inheritRoles = False
    app.security = {'administrators': 8}
    app.append_to('apps')
    sys.stdout.write('[OK]\n')

    sys.stdout.write('Creating OQL Query Performer application...')
    app = org.innoscript.desktop.schema.common.Application()
    app._id = 'oqlqueryperf'
    app.displayName.value = 'OQL Query Performer'
    app._isSystem = True
    app.launchUrl.value = 'queryperformer/queryperformer.quix'
    app.icon.value = 'queryperformer/images/icon.gif'
    app.inheritRoles = False
    app.security = {'administrators': 8}
    app.append_to('apps')
    sys.stdout.write('[OK]\n')
