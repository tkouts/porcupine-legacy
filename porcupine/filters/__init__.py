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
Porcupine post and pre processing filters.
"""
from porcupine.core.decorators import WebMethodWrapper

from porcupine.filters import output
from porcupine.filters import authorization
from porcupine.filters import caching

def filter(filter_class, **kwargs):
    "filter decorator"
    class FDecorator(WebMethodWrapper):
        def get_wrapper(self):
            def f_wrapper(item, context):
                kwargs['wrapper'] = self
                if filter_class.type == 'pre':
                    filter_class.apply(context, item, None, **kwargs)
                self.decorator.__get__(item, item.__class__)(context)
                if filter_class.type == 'post':
                    filter_class.apply(context, item, None, **kwargs)
            return f_wrapper
    return FDecorator

def runas(userid):
    """
    The runas filter allows web methods to run under
    a specific user account.
    """
    return filter(authorization.RunAs, userid=userid)

def i18n(resources):
    return filter(output.I18n, using=resources)

def gzip():
    return filter(output.Gzip)

def requires_login(redirect=None):
    return filter(authorization.RequiresLogin, redirect=redirect)

def requires_policy(policyid):
    return filter(authorization.RequiresPolicy, policyid=policyid)

def etag(generator=caching.ETag.generate_webmethod_etag):
    return filter(caching.ETag, generator=generator)
