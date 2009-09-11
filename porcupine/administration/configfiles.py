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
"Helper classes for managing the Porcupine configuration files"
import pprint
from xml.dom import minidom

class SettingsManager(object):
    def __init__(self):
        conf_file = open('conf/porcupine.conf', 'r')
        try:
            self.settings = eval(conf_file.read().replace('\r\n', '\n'))
        finally:
            conf_file.close()
            
    def save(self):
        conf_file = open('conf/porcupine.conf', 'w')
        conf_file.write(pprint.pformat(self.settings, 4))
        conf_file.close()

class PubDirManager(object):
    def __init__(self):
        self._xmlfile = minidom.parse('conf/pubdir.xml')
        
    def getDirNode(self, dirName):
        dirlist = self._xmlfile.getElementsByTagName('dir')
        for dirnode in dirlist:
            if dirName == dirnode.getAttribute('name'):
                return dirnode
    
    def addDirNode(self, dirNode):
        dirs_node = self._xmlfile.getElementsByTagName('dirs')[0]
        dirs_node.appendChild(dirNode)
    
    def removeDirNode(self, dirNode):
        dirs_node = self._xmlfile.getElementsByTagName('dirs')[0]
        dirs_node.removeChild(dirNode)

    def replaceDirNode(self, new_node, old_node):
        dirs_node = self._xmlfile.getElementsByTagName('dirs')[0]
        dirs_node.replaceChild(new_node, old_node)

    def close(self, commitChanges):
        if commitChanges:
            configfile = open('conf/pubdir.xml', 'wb')
            configfile.write(self._xmlfile.toxml('utf-8'))
            configfile.close()
        self._xmlfile.unlink()

