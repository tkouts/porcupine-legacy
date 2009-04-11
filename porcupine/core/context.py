#===============================================================================
#    Copyright 2005-2009 Tassos Koutsovassilis
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
"Security context classes"
from threading import Thread

from porcupine import db

class ContextThread(Thread):
    """
    Base thread class for providing the required security context.
    """
    def __init__(self, target, name, user_id=None, args=()):
        Thread.__init__(self, name=name, target=target, args=args)
        if user_id != None:
            user = db._db.get_item(user_id)
        else:
            user = None
        self.context = SecurityContext(user)

class SecurityContext(object):
    """
    An instance of this class should be attached to any thread that is
    accessing the Porcupine API.
    
    The user attribute is the user the current thread is acting on behalf.
    """
    def __init__(self, user=None):
        self.user = user
        self.trans = None
