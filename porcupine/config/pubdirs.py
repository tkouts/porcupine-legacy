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
"Parser module for the server's published directories"
import re
import os.path
from xml.dom import minidom

from porcupine.core.compat import basestring
from porcupine.utils import misc


class Registration(object):
    __slots__ = ('path', 'context', 'type', 'encoding', 'filters', 'max_age')

    def __init__(self, path, identifier, enc, filters, max_age):
        self.path = path
        self.context = identifier
        if identifier[-4:] == '.psp':
            self.type = 1
        else:
            self.type = 0

        self.encoding = enc
        self.filters = filters
        self.max_age = int(max_age)

    def get_filter_by_type(self, type):
        if isinstance(type, basestring):
            type = misc.get_rto_by_name(type)
        filter = [f for f in self.filters
                  if f[0] == type][0]
        return filter


class Dir(object):
    def __init__(self, dirNode):
        self.path = dirNode.getAttribute('path')
        self.__config = []
        self.__matchlist = []
        self.__cache = {}
        configXML = minidom.parse(self.path + '/config.xml')
        contextList = configXML.getElementsByTagName('context')

        # construct action list
        for context_node in contextList:
            sPath = context_node.getAttribute('path') or None
            sMatch = context_node.getAttribute('match') or None
            sMethod = context_node.getAttribute('method')
            sBrowser = context_node.getAttribute('client')
            sLang = context_node.getAttribute('lang')
            sAction = context_node.getAttribute('action') or ''
            encoding = (context_node.getAttribute('encoding').
                        encode('iso-8859-1') or None)
            max_age = context_node.getAttribute('max-age') or 0

            if sPath:
                self.__config.append((
                    (sPath, sMethod, sBrowser, sLang),
                    Registration(self.path + '/' + sPath,
                                 self.path + '/' + sAction,
                                 encoding,
                                 self.__get_filters_list(context_node),
                                 max_age)))
            elif sMatch:
                self.__matchlist.append((
                    (sMatch, sMethod, sBrowser, sLang),
                    (None,
                     self.path + '/' + sAction,
                     encoding,
                     self.__get_filters_list(context_node),
                     max_age)))

        configXML.unlink()

    def __get_filters_list(self, context_node):
        filterList = context_node.getElementsByTagName('filter')
        filters = []
        for filterNode in filterList:
            type = filterNode.getAttribute('type')
            filter = [misc.get_rto_by_name(type), {}]
            for attr in filterNode.attributes.keys():
                filter[1][str(attr)] = filterNode.getAttribute(attr)
            filters.append(tuple(filter))
        return tuple(filters)

    def get_registration(self, sPath, sHttpMethod='GET', sBrowser='.*',
                         sLang='.*'):
        cache_key = (sPath, sHttpMethod, sBrowser, sLang)
        if cache_key in self.__cache:
            return self.__cache[cache_key]
        else:
            for paramList in self.__config:
                Path, HttpMethod, Browser, Lang = paramList[0]
                if (Path == sPath and re.match(HttpMethod, sHttpMethod)
                        and re.search(Browser, sBrowser)
                        and re.match(Lang, sLang)):
                    registration = paramList[1]
                    self.__cache[cache_key] = registration
                    return registration
            for paramList in self.__matchlist:
                Match, HttpMethod, Browser, Lang = paramList[0]
                match = re.match(Match, sPath)
                if (match and re.match(HttpMethod, sHttpMethod)
                        and re.search(Browser, sBrowser)
                        and re.match(Lang, sLang)):
                    registration_params = paramList[1]

                    action = registration_params[1]

                    def repl(mo):
                        ind = int(mo.group(0)[-1])
                        s = match.group(ind)
                        return s

                    action = re.sub('\$\d', repl, action)

                    if (os.path.isfile(action)):
                        registration = Registration(registration_params[0],
                                                    action,
                                                    *registration_params[2:])
                        self.__cache[cache_key] = registration
                        return registration
            self.__cache[cache_key] = None
            return None

dirs = {}

configDom = minidom.parse('conf/pubdir.xml')
for dirNode in configDom.getElementsByTagName('dir'):
    dir = Dir(dirNode)
    dirs[dirNode.getAttribute('name')] = dir

configDom.unlink()
del configDom
