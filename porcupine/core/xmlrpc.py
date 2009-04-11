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
"Porcupine XML-RPC Library"

import cStringIO
from xml.dom import minidom

from porcupine import datatypes
from porcupine import systemObjects
from porcupine.core import objectSet
from porcupine.utils import date, xml

class XMLRPCParams(list):
    default_props = ('id', 'modified', 'owner', 'created', '__image__',
                     'contentclass', 'parentid', 'isCollection')
    def __init__(self, oList=[], encoding='utf-8'):
        list.__init__(self, oList)
        self.method = None
        self.encoding = encoding

    def serialize(self):
        xml = cStringIO.StringIO()
        xml.write('<params>')
        for param in self:
            xml.write('<param>')
            xml.write(self.__serializeParam(param))
            xml.write('</param>')
        xml.write('</params>')
        sXml = xml.getvalue()
        xml.close()
        return(sXml)

    def loadXML(self, s):
        oDom = minidom.parseString(s)
        oMethodCall = oDom.getElementsByTagName('methodCall')[0]
        self.method = oMethodCall.getElementsByTagName('methodName')[0].childNodes[0].data
        params = oMethodCall.getElementsByTagName('params')
        if params:
            params = params[0].getElementsByTagName('param')
            for param in params:
                self.append(self.__getParam(param.getElementsByTagName('value')[0]))
        oDom.unlink()
        
    def __getParam(self, param):
        childNodes = self.__getDirectChildren(param)
        if len(childNodes)==1:
            param = childNodes[0]
            if param.tagName == 'string':
                if param.childNodes:
                    return(param.childNodes[0].data.encode(self.encoding))
                else:
                    return ''
            elif param.tagName == 'i4' or param.tagName == 'int':
                return(int(param.childNodes[0].data))
            elif param.tagName == 'boolean':
                return(bool(int(param.childNodes[0].data)))
            elif param.tagName == 'double':
                return(float(param.childNodes[0].data))
            elif param.tagName == 'dateTime.iso8601':
                oDate = date.Date.from_iso_8601(param.childNodes[0].data)
                return(oDate)
            elif param.tagName == 'array':
                arr = []
                if (param.getElementsByTagName('data')):
                    elements = self.__getDirectChildren(param.getElementsByTagName('data')[0])
                else:
                    elements = self.__getDirectChildren(param)
                for element in elements:
                    arr.append(self.__getParam(element))
                return arr
            elif param.tagName == 'struct':
                struct = {}
                members = self.__getDirectChildren(param)
                for member in members:
                    sName = member.getElementsByTagName('name')[0].childNodes[0].data
                    memberValue = self.__getParam(member.getElementsByTagName('value')[0])
                    struct[sName] = memberValue
                return struct
        elif len(childNodes)==0:
            return(param.childNodes[0].data)

    def __getDirectChildren(self, node):
        children = [e for e in node.childNodes
                   if e.nodeType == e.ELEMENT_NODE]   
        return children

    def __serializeParam(self, param):
        if type(param)==str:
            return '<value>%s</value>' % xml.xml_encode(param)
        elif type(param)==unicode:
            return '<value>%s</value>' % xml.xml_encode(param.encode(self.encoding))
        elif type(param)==int or type(param)==long:
            return '<value><i4>%i</i4></value>' % param
        elif type(param)==bool:
            return '<value><boolean>%i</boolean></value>' % param
        elif type(param)==float:
            return '<value><double>%f</double></value>' % param
        elif type(param)==list or type(param)==tuple:
            s = ['<value><array><data>']
            s += filter(None, [self.__serializeParam(x)
                               for x in param])
            s += ['</data></array></value>']
            return ''.join(s)
        elif type(param) == dict:
            s = ['<value><struct>']
            for member, value in param.items():
                serialized = self.__serializeParam(value)
                if serialized:
                    s.append('<member><name>%s</name>%s</member>' % 
                             (member.encode(self.encoding), serialized))
            s.append('</struct></value>')
            return ''.join(s)
        elif isinstance(param, objectSet.ObjectSet):
            s = ['<value><array><data>']
            s += [self.__serializeParam(x)
                  for x in param]
            s += ['</data></array></value>']
            return ''.join(s)
        elif isinstance(param, (systemObjects.GenericItem,
                                systemObjects.Composite)):
            xmlrpc_object = {}
            for attr in param.__props__ + self.default_props:
                try:
                    oAttr = getattr(param, attr)
                except AttributeError:
                    continue
                if isinstance(oAttr, datatypes.ExternalAttribute):
                    xmlrpc_object[attr] = '[EXTERNAL STREAM]'
                elif isinstance(oAttr, datatypes.ReferenceN):
                    xmlrpc_object[attr] = [{'id': x._id,
                                            'displayName': x.displayName.value}
                                            for x in oAttr.get_items()]
                elif isinstance(oAttr, datatypes.Reference1):
                    item_ref = oAttr.get_item()
                    xmlrpc_object[attr] = {'id': oAttr.value}
                    if item_ref != None:
                        xmlrpc_object[attr]['displayName'] = \
                            item_ref.displayName.value
                elif isinstance(oAttr, datatypes.Date):
                    xmlrpc_object[attr] = oAttr
                elif isinstance(oAttr, datatypes.DataType):
                    xmlrpc_object[attr] = oAttr.value
                elif attr in ('created', 'modified'):
                    xmlrpc_object[attr] = date.Date(oAttr)
                else:
                    xmlrpc_object[attr] = oAttr
            return self.__serializeParam(xmlrpc_object)
        elif isinstance(param, date.Date):
            return '<value><dateTime.iso8601>%s</dateTime.iso8601></value>' % \
                    param.to_iso_8601()
        else:
            return None#self.__serializeParam(str(param))
