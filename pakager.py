#!/usr/bin/env python
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
"Porcupine Server Package Manager"

import getopt
import sys
import os
import tarfile
import ConfigParser
from xml.dom import minidom

from porcupine.core import persist
from porcupine.utils.misc import freeze_support
from porcupine import datatypes
from porcupine.administration import offlinedb
from porcupine.administration import configfiles
from porcupine.config.settings import settings

__usage__ = """
Install package:
    python pakager.py -i -p PACKAGE_FILE or
    python pakager.py --install --package=PACKAGE_FILE
    
Uninstall package:
    python pakager.py -u -p PACKAGE_FILE or
    python pakager.py --uninstall --package=PACKAGE_FILE
    
Create package:
    python pakager.py -c -d PACKAGE_DEFINITION_FILE or
    python pakager.py --create --def=PACKAGE_DEFINITION_FILE
"""

class Package(object):
    tmp_folder = settings['global']['temp_folder']
    def __init__(self, package_file=None, ini_file=None):
        self.package_files = []
        self.db = None
        self.name = None
        self.version = None
        self.package_file = None
        
        if package_file:
            self.package_file = tarfile.open(package_file, 'r:gz')
            ini_file = self.package_file.extractfile('_pkg.ini')
        elif ini_file:
            ini_file = file(ini_file)
        
        if ini_file:
            self.config_file = ConfigParser.RawConfigParser()
            self.config_file.readfp(ini_file)
            self.name = self.config_file.get('package', 'name')
            self.version = self.config_file.get('package', 'version')
            if not package_file:
                self.package_file = tarfile.open(self.name + '-' + \
                                                 self.version + '.ppf', 'w:gz')
    
    def close(self):
        if self.package_file:
            self.package_file.close()
    
    def _exportItem(self, id, clearRolesInherited=True):
        it_file = file(self.tmp_folder + '/' + id, 'wb')
        item = self.db.get_item(id)
        if clearRolesInherited:
            item.inheritRoles = False
        
        # load external attributes
        for prop in [getattr(item, x) for x in item.__props__]:
            if isinstance(prop, datatypes.ExternalAttribute):
                prop.get_value()
        
        it_file.write(persist.dumps(item))
        it_file.close()
        self.package_files.append(
            (
                self.package_file.gettarinfo(
                    it_file.name,
                    '_db/' + os.path.basename(it_file.name)
                ), it_file.name
            )
        ) 
        if item.isCollection:
            dummy = [
                self._exportItem(childid, False)
                for childid in item._subfolders.values() + item._items.values()
            ]
    
    def _importItem(self, fileobj, txn):
        sItem = fileobj.read()
        oItem = persist.loads(sItem)
        oParent = self.db.get_item(oItem.parentid, txn)
        #check if the item already exists
        oOldItem = self.db.get_item(oItem.id, txn)
        if oOldItem == None:
            # write external attributes
            for prop in [getattr(oItem, x) for x in oItem.__props__]:
                if isinstance(prop, datatypes.ExternalAttribute):
                    prop._isDirty = True
                    prop._eventHandler.on_create(oItem, prop, txn)
    
            if oParent and not(oItem._id in oParent._items.values() + \
                                           oParent._subfolders.values()):
                if oItem.isCollection:
                    oParent._subfolders[oItem.displayName.value] = oItem._id
                else:
                    oParent._items[oItem.displayName.value] = oItem._id
                self.db.put_item(oParent, txn)
            self.db.put_item(oItem, txn)
        else:
            print 'WARNING: Item "%s" already exists. Upgrading object...' % \
                oItem.displayName.value
            oItem.displayName.value = oOldItem.displayName.value
            oItem.description.value = oOldItem.description.value
            oItem.inheritRoles = oOldItem.inheritRoles
            oItem.modifiedBy = oOldItem.modifiedBy
            oItem.modified = oOldItem.modified
            oItem._created = oOldItem._created
            oItem.security = oOldItem.security
            if oItem.isCollection:
                oItem._subfolders = oOldItem._subfolders
                oItem._items = oOldItem._items
            self.db.put_item(oItem, txn)
        
    def _deltree(self, top):
        for root, dirs, files in os.walk(top, topdown=False):
            for name in files:
                os.remove(os.path.join(root, name))
            for name in dirs:
                os.rmdir(os.path.join(root, name))
        os.rmdir(top)
        
    def _addtree(self, path):
        self.package_files.append(
            (self.package_file.gettarinfo(path, path), path)
        )

    def install(self):
        print 'INFO: installing [%s-%s] package...' % (self.name, self.version)
        contents = self.package_file.getnames()
        
        # pre-install script
        if '_pre.py' in contents:
            print 'INFO: running pre installation script...'
            self.package_file.extract('_pre.py', self.tmp_folder)
            execfile(self.tmp_folder + '/_pre.py')
            os.remove(self.tmp_folder + '/_pre.py')
        
        # published directories
        if '_pubdir.xml' in contents:
            print 'INFO: installing published directories...'
            dirsfile = self.package_file.extractfile('_pubdir.xml')
            _dom = minidom.parse(dirsfile)
            dirsConfig = configfiles.PubDirManager()
            dir_nodes = _dom.getElementsByTagName('dir')
            for dir_node in dir_nodes:
                dir_node = dir_node.cloneNode(True)
                dir_name = dir_node.getAttribute('name')
                print 'INFO: installing published directory "%s"' % dir_name
                old_node = dirsConfig.getDirNode(dir_name)
                if old_node:
                    dirsConfig.replaceDirNode(dir_node, old_node)
                else:
                    dirsConfig.addDirNode(dir_node)
            _dom.unlink()
            dirsConfig.close(True)
                
        # files and dirs
        for pfile in [x for x in contents if x[0] != '_']:
            print 'INFO: extracting ' + pfile
            self.package_file.extract(pfile)
                
        # database
        dbfiles = [x for x in contents if x[:4] == '_db/']
        if dbfiles:
            self.db = offlinedb.get_handle()
            txn = self.db.get_transaction()
            try:
                for dbfile in dbfiles:
                    print 'INFO: importing object ' + os.path.basename(dbfile)
                    actual_fn = self.tmp_folder + '/' + dbfile
                    objfile = None
                    try:
                        try:
                            self.package_file.extract(dbfile, self.tmp_folder)
                            objfile = file(actual_fn, 'rb')
                            self._importItem(objfile, txn)
                        except Exception, e:
                            txn.abort()
                            raise e
                            sys.exit(2)
                    finally:
                        if objfile:
                            objfile.close()
                        if os.path.exists(actual_fn):
                            os.remove(actual_fn)
                txn.commit()
            finally:
                offlinedb.close()
                if os.path.exists(self.tmp_folder + '/_db'):
                    os.rmdir(self.tmp_folder + '/_db')
            
        # post-install script
        if '_post.py' in contents:
            print 'INFO: running post installation script...'
            self.package_file.extract('_post.py', self.tmp_folder)
            execfile(self.tmp_folder + '/_post.py')
            os.remove(self.tmp_folder + '/_post.py')
            
    def uninstall(self):
        print 'INFO: uninstalling [%s-%s] package...' % (self.name, self.version)
        
        # database items
        items = self.config_file.options('items')
        itemids = [self.config_file.get('items', x) for x in items]
        self.db = offlinedb.get_handle()
        txn = self.db.get_transaction()
        try:
            try:
                for itemid in itemids:
                    print 'INFO: removing object %s' % itemid
                    try:
                        oItem = self.db.get_item(itemid, txn)
                    except:
                        pass
                    else:
                        oItem.delete(txn)
                txn.commit()
            except Exception, e:
                txn.abort()
                raise e
                sys.exit(2)
        finally:
            offlinedb.close()
            
        # uninstall script
        contents = self.package_file.getnames()
        if '_uninstall.py' in contents:
            print 'INFO: running uninstallation script...'
            self.package_file.extract('_uninstall.py', self.tmp_folder)
            execfile(self.tmp_folder + '/_uninstall.py')
            os.remove(self.tmp_folder + '/_uninstall.py')
        
        # files
        files = self.config_file.options('files')
        for fl in files:
            fname = self.config_file.get('files', fl)
            print 'INFO: removing file ' + fname
            if os.path.exists(fname):
                os.remove(fname)
            # check if it is a python file
            if fname[-3:] == '.py':
                dummy = [
                    os.remove(fname + x)
                    for x in ('c', 'o')
                    if os.path.exists(fname + x)
                ]
    
        # directories
        dirs = self.config_file.options('dirs')
        for dir in dirs:
            dirname = self.config_file.get('dirs', dir)
            if os.path.exists(dirname):
                print 'INFO: removing directory ' + dirname
                self._deltree(dirname)
                
        # published dirs
        if '_pubdir.xml' in contents:
            print 'INFO: uninstalling web apps...'
            dirsfile = self.package_file.extractfile('_pubdir.xml')
            _dom = minidom.parse(dirsfile)
            dirsConfig = configfiles.PubDirManager()
            dir_nodes = _dom.getElementsByTagName('dir')
            for dir_node in dir_nodes:
                #app_node = app_node.cloneNode(True)
                dir_name = dir_node.getAttribute('name')
                print 'INFO: uninstalling published directory "%s"' % dir_name
                old_node = dirsConfig.getDirNode(dir_name)
                if old_node:
                    dirsConfig.removeDirNode(old_node)
                else:
                    print 'WARNING: published directory "%s" does not exist' % dir_name
                dirname = dir_node.getAttribute('path')
                if os.path.exists(dirname):
                    self._deltree(dirname)

            _dom.unlink()
            dirsConfig.close(True)

    def create(self):
        # files
        files = self.config_file.options('files')
        for fl in files:
            fname = self.config_file.get('files', fl)
            print 'INFO: adding file ' + fname
            self.package_files.append(
                (self.package_file.gettarinfo(fname, fname), fname)
            )
    
        # directories
        dirs = self.config_file.options('dirs')
        for dir in dirs:
            dirname = self.config_file.get('dirs', dir)
            print 'INFO: adding directory ' + dirname
            self._addtree(dirname)
        
        # published directories
        if self.config_file.has_section('pubdir'):
            pubdirs = self.config_file.options('pubdir')
            dirsConfig = configfiles.PubDirManager()
            
            dir_nodes = []
            for dir in pubdirs:
                dirname = self.config_file.get('pubdir', dir)
                print 'INFO: adding published directory "%s"' % dirname
                dir_node = dirsConfig.getDirNode(dirname)
                if dir_node:
                        dir_nodes.append(dir_node)
                        dir_location = dir_node.getAttribute('path')
                        self._addtree(dir_location)
                else:
                    print 'WARNING: published directory "%s" does not exist' % appname
            
            if dir_nodes:
                dirsFile = file(self.tmp_folder + '/_pubdir.xml', 'w')
                dirsFile.write('<?xml version="1.0" encoding="utf-8"?><dirs>')
                for dir_node in dir_nodes:
                    dirsFile.write(dir_node.toxml('utf-8'))
                dirsFile.write('</dirs>')
                dirsFile.close()
                self.package_files.append(
                    (
                        self.package_file.gettarinfo(
                            dirsFile.name, os.path.basename(dirsFile.name)
                        ),
                        dirsFile.name
                    )
                )
            dirsConfig.close(False)
        
        # database items
        items = self.config_file.options('items')
        itemids = [self.config_file.get('items', x) for x in items]
        self.db = offlinedb.get_handle()
        try:
            for itemid in itemids:
                self._exportItem(itemid)
        finally:
            offlinedb.close()
                
        # scripts
        if self.config_file.has_option('scripts', 'preinstall'):
            preinstall = self.config_file.get('scripts', 'preinstall')
            print 'INFO: adding pre-install script "%s"' % preinstall
            self.package_files.append(
                (
                    self.package_file.gettarinfo(preinstall, '_pre.py'),
                    preinstall
                )
            )

        if self.config_file.has_option('scripts', 'postinstall'):
            postinstall = self.config_file.get('scripts', 'postinstall')
            print 'INFO: adding post-install script "%s"' % postinstall
            self.package_files.append(
                (
                    self.package_file.gettarinfo(postinstall, '_post.py'),
                    postinstall
                )
            )
                
        if self.config_file.has_option('scripts', 'uninstall'):
            uninstall = self.config_file.get('scripts', 'uninstall')
            print 'INFO: adding uninstall script "%s"' % uninstall
            self.package_files.append(
                (
                    self.package_file.gettarinfo(uninstall, '_uninstall.py'),
                    uninstall
                )
            )
            
        # definition file
        self.package_files.append((
                self.package_file.gettarinfo(definition, '_pkg.ini'),
                definition))

        # compact files
        print 'INFO: compacting...'
        for tarinfo, fname in self.package_files:
            if tarinfo.isfile():
                self.package_file.addfile(tarinfo, file(fname, 'rb'))
                # remove temporary
                if fname[:len(self.tmp_folder)] == self.tmp_folder:
                    os.remove(fname)
            else:
                if type(fname) == unicode:
                    fname = str(fname)
                self.package_file.add(fname)

def usage():
    print __usage__
    sys.exit(2)

if __name__ == '__main__':
    freeze_support()

    # get arguments
    argv = sys.argv[1:]
    try:
        opts, args = getopt.getopt(
            argv, "iucp:d:", ["install","uninstall","create","package=","def="]
        )
    except getopt.GetoptError:
        usage()
        
    command = None
    package = None
    definition = None

    if opts:
        for opt, arg in opts:                
            if opt in ('-i', '--install'):
                command = 'INSTALL'
            elif opt in ('-u', '--uninstall'):
                command = 'UNINSTALL'
            elif opt in ('-c', '--create'):
                command = 'CREATE'
            elif opt in ('-p', '--package'):
                package = arg
            elif opt in ('-d', '--def'):
                definition = arg
    else:
        usage()
    
    if not command:
        usage()
        
    my_pkg = None
    
    try:
        if command in ('INSTALL', 'UNINSTALL'):
            if not(package):
                usage()
            my_pkg = Package(package_file = package)
            if command == 'INSTALL':
                my_pkg.install()
            else:
                my_pkg.uninstall()
        else:
            if not definition:
                usage()
            my_pkg = Package(ini_file = definition)
            my_pkg.create()
    finally:
        if my_pkg != None:
            my_pkg.close()
