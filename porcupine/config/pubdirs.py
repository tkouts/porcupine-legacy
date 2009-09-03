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
"Parser module for the server's published directories"
import re
import os.path
from xml.dom import minidom

from porcupine.utils import misc

class Registration(object):
    __slots__ = ('context', 'type', 'encoding', 'filters', 'max_age')
    def __init__(self, identifier, enc, filters, max_age):
        self.context = identifier
        if identifier[-4:] == '.psp':
            self.type = 1
        else:
            self.type = 0
        
        self.encoding = enc
        self.filters = filters
        self.max_age = int(max_age)

class Dir(object):
    def __init__(self, dirNode):
        self.path = dirNode.getAttribute('path')
        self.__config = []
        self.__matchlist = []
        self.__cache = {}
        configXML = minidom.parse(self.path + '/config.xml')
        contextList = configXML.getElementsByTagName('context')
        # construct action list
        for contextNode in contextList:
            sPath = contextNode.getAttribute('path') or None
            sMatch = contextNode.getAttribute('match') or None
            sMethod = contextNode.getAttribute('method')
            sBrowser = contextNode.getAttribute('client')
            sLang = contextNode.getAttribute('lang')
            sAction = contextNode.getAttribute('action')
            encoding = contextNode.getAttribute('encoding').encode('iso-8859-1') or None
            max_age = contextNode.getAttribute('max-age') or 0
            
            if sPath:
                self.__config.append((
                    (sPath, sMethod, sBrowser, sLang),
                    Registration(self.path + '/' + sAction, encoding,
                                 self.__getFiltersList(contextNode), max_age)
                ))
            elif sMatch:
                self.__matchlist.append((
                    (sMatch, sMethod, sBrowser, sLang),
                    (self.path + '/' + sAction, encoding,
                         self.__getFiltersList(contextNode), max_age)
                ))
            
        configXML.unlink()
        
    def __getFiltersList(self, contextNode):
        filterList = contextNode.getElementsByTagName('filter')
        filters = []
        for filterNode in filterList:
            type = filterNode.getAttribute('type')
            filter = [misc.get_rto_by_name(type), {}]
            for attr in filterNode.attributes.keys():
                filter[1][str(attr)] = filterNode.getAttribute(attr)
            filters.append( tuple(filter) )
        return tuple(filters)

    def getRegistration(self, sPath, sHttpMethod, sBrowser, sLang):
        if (sPath, sHttpMethod, sBrowser, sLang) in self.__cache:
            return self.__cache[(sPath, sHttpMethod, sBrowser, sLang)]
        else:
            for paramList in self.__config:
                Path, HttpMethod, Browser, Lang = paramList[0]
                if Path==sPath and re.match(HttpMethod, sHttpMethod) and \
                        re.search(Browser, sBrowser) and \
                        re.match(Lang, sLang):
                    registration = paramList[1]
                    self.__cache[(sPath, sHttpMethod, sBrowser, sLang)] = registration
                    return registration
            for paramList in self.__matchlist:
                Match, HttpMethod, Browser, Lang = paramList[0]
                match = re.match(Match, sPath)
                if match and re.match(HttpMethod, sHttpMethod) and \
                        re.search(Browser, sBrowser) and \
                        re.match(Lang, sLang):
                    registration_params = paramList[1]
                    
                    path = registration_params[0]
                    
                    def repl(mo):
                        ind = int(mo.group(0)[-1])
                        s = match.group(ind)
                        return s
                    
                    path = re.sub('\$\d', repl, path)
                    
                    if (os.path.isfile(path)):
                        registration = Registration(path, *registration_params[1:])
                        self.__cache[(path, sHttpMethod, sBrowser, sLang)] = registration
                        return registration
            self.__cache[(sPath, sHttpMethod, sBrowser, sLang)] = None
            return None
dirs = {}

configDom = minidom.parse('conf/pubdir.xml')
for dirNode in configDom.getElementsByTagName('dir'):
    dir = Dir(dirNode)
    dirs[dirNode.getAttribute('name')] = dir

configDom.unlink()
del configDom
