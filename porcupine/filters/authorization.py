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
"""
Porcupine authorization pre-processing filters
"""
try:
    # python 2.6
    from urllib import quote
except ImportError:
    # python 3
    from urllib.parse import quote

from porcupine import exceptions
from porcupine.filters.filter import PreProcessFilter
from porcupine.db import _db


class RequiresLogin(PreProcessFilter):

    @staticmethod
    def apply(context, item, registration, **kwargs):
        user = context.user
        redirect_url = kwargs['redirect']
        if redirect_url is not None:
            return_url = quote("%s://%s%s" % (context.request.get_protocol(),
                                              context.request.HTTP_HOST,
                                              context.request.REQUEST_URI))

        if not hasattr(user, 'authenticate'):
            if redirect_url is not None:
                if redirect_url[0:4] != 'http':
                    redirect_url = context.request.SCRIPT_NAME + redirect_url

                if redirect_url.find('?') != -1:
                    templ = "%s&ru=%s" 
                else:
                    templ = "%s?ru=%s"

                redirect_url = templ % (redirect_url, return_url)
                context.response.redirect(redirect_url)
            else:
                raise exceptions.PermissionDenied


class RunAs(PreProcessFilter):

    @staticmethod
    def apply(context, item, registration, **kwargs):
        user = _db.get_item(kwargs['userid'])
        context.original_user = context.user
        context.user = user


class RequiresPolicy(PreProcessFilter):

    @staticmethod
    def apply(context, item, registration, **kwargs):
        policyid = kwargs['policyid']
        policy = _db.get_item(policyid)
        user = context.user
        policyGrantedTo = policy.policyGranted.value

        userID = user._id
        if userID in policyGrantedTo or user.is_admin():
            return

        memberOf = ['everyone']
        memberOf.extend(user.memberof.value)
        if hasattr(user, 'authenticate'):
            memberOf.append('authusers')

        for groupid in memberOf:
            if groupid in policyGrantedTo:
                return

        raise exceptions.PermissionDenied(
            "This action is restricted due to policy '%s'" %
            policy.displayName.value)
