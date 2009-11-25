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
import io
import os
import tarfile
import time
import shutil
try:
    # python 2.6
    import ConfigParser as configparser
except ImportError:
    # python 3
    import configparser
from xml.dom import minidom

from porcupine import db
from porcupine import datatypes
from porcupine.core import persist
from porcupine.core.runtime import logger
from porcupine.administration import configfiles
from porcupine.config import pubdirs
from porcupine.config.services import services
from porcupine.config.settings import settings
from porcupine.core.compat import str

class Package(object):
    tmp_folder = settings['global']['temp_folder']

    def __init__(self, package_file=None, ini_file=None):
        self.package_files = []
        self.name = None
        self.version = None
        self.package_file = None
        self.ini_file = None

        if package_file:
            self.package_file = tarfile.open(package_file, 'r:gz')
            ini_file = io.StringIO(
                self.package_file.extractfile('_pkg.ini').read().decode())
        elif ini_file:
            self.ini_file = ini_file
            ini_file = open(ini_file)

        if ini_file:
            self.config_file = configparser.RawConfigParser()
            self.config_file.readfp(ini_file)
            self.name = self.config_file.get('package', 'name')
            self.version = self.config_file.get('package', 'version')
            if not package_file:
                self.package_file = tarfile.open(self.name + '-' + \
                                                 self.version + '.ppf', 'w:gz')

    def close(self):
        if self.package_file:
            self.package_file.close()

    def _export_item(self, item, clear_roles_inherited=True):
        it_file = open(self.tmp_folder + '/' + item._id, 'wb')
        if clear_roles_inherited:
            item.inheritRoles = False

        # load external attributes
        for prop in [getattr(item, x) for x in item.__props__]:
            if isinstance(prop, datatypes.ExternalAttribute):
                prop.get_value()

        it_file.write(persist.dumps(item))
        it_file.close()
        self.package_files.append((
                self.package_file.gettarinfo(
                    it_file.name,
                    '_db/' + os.path.basename(it_file.name)),
                it_file.name))
        if item.isCollection:
            cursor = db._db.get_children(item._id)
            cursor.enforce_permissions = False
            [self._export_item(child, False) for child in cursor]
            cursor.close()

    def _import_item(self, fileobj):
        stream = fileobj.read()
        item = persist.loads(stream)

        # TODO: remove next block
        # kept for backwards compatibility
        if hasattr(item, '_parentid'):
            pid = item._parentid
            delattr(item, '_parentid')
            item._pid = pid
        if hasattr(item, '_containerid'):
            pid = item._containerid
            delattr(item, '_containerid')
            item._pid = pid

        #check if the item already exists
        old_item = db._db.get_item(item.id)
        if old_item is None:
            # write external attributes
            for prop in [getattr(item, x) for x in item.__props__
                         if hasattr(item, x)]:
                if isinstance(prop, datatypes.ExternalAttribute):
                    prop._isDirty = True
                    prop._eventHandler.on_create(item, prop)
            # update parent's modification date
            p = db._db.get_item(item._pid)
            if p is not None:
                p.modified = time.time()
                db._db.put_item(p)
            db._db.put_item(item)
        else:
            logger.info('Item "%s" already exists. Upgrading object...' %
                        item.displayName.value)
            item.displayName.value = old_item.displayName.value
            item.description.value = old_item.description.value
            item.inheritRoles = old_item.inheritRoles
            item.modifiedBy = old_item.modifiedBy
            item.modified = old_item.modified
            item._created = old_item._created
            item.security = old_item.security
            db._db.put_item(item)

    def _addtree(self, path):
        self.package_files.append((
            self.package_file.gettarinfo(path, path), path))

    def _execute_script(self, filename, name):
        exec(compile(open(filename).read(), name, 'exec'))

    def install(self):
        logger.info('Installing [%s-%s] package...' % (self.name, self.version))
        contents = self.package_file.getnames()

        # pre-install script
        if '_pre.py' in contents:
            logger.info('Running pre installation script...')
            self.package_file.extract('_pre.py', self.tmp_folder)
            self._execute_script(self.tmp_folder + '/_pre.py',
                                 'Pre-installation script')
            os.remove(self.tmp_folder + '/_pre.py')

        # files and dirs
        for pfile in [x for x in contents if x[0] != '_']:
            logger.info('Extracting ' + pfile)
            self.package_file.extract(pfile)

        # published directories
        if '_pubdir.xml' in contents:
            logger.info('Installing published directories...')
            dirsfile = self.package_file.extractfile('_pubdir.xml')
            _dom = minidom.parse(dirsfile)
            dirsConfig = configfiles.PubDirManager()
            dir_nodes = _dom.getElementsByTagName('dir')
            for dir_node in dir_nodes:
                dir_node = dir_node.cloneNode(True)
                dir_name = dir_node.getAttribute('name')
                logger.info('Installing published directory "%s"' % dir_name)
                old_node = dirsConfig.getDirNode(dir_name)
                if old_node:
                    dirsConfig.replaceDirNode(dir_node, old_node)
                else:
                    dirsConfig.addDirNode(dir_node)
                # update published directories
                dir = pubdirs.Dir(dir_node)
                pubdirs.dirs[dir_name] = dir
                # add published directory in multi-processing enviroments
                services.notify(('ADD_PUBDIR', (dir_name, dir)))

            _dom.unlink()
            dirsConfig.close(True)

        # database
        dbfiles = [x for x in contents if x[:4] == '_db/']
        if dbfiles:

            @db.transactional(auto_commit=True)
            def _import_items():
                for dbfile in dbfiles:
                    logger.info('Importing object ' + os.path.basename(dbfile))
                    fn = '%s/%s' % (self.tmp_folder, dbfile)
                    self.package_file.extract(dbfile, self.tmp_folder)
                    objfile = None
                    try:
                        objfile = open(fn, 'rb')
                        self._import_item(objfile)
                    finally:
                        if objfile:
                            objfile.close()

            # import objects
            try:
                _import_items()
            finally:
                if os.path.exists(self.tmp_folder + '/_db'):
                    shutil.rmtree(self.tmp_folder + '/_db', True)

        # post-install script
        if '_post.py' in contents:
            logger.info('Running post installation script...')
            self.package_file.extract('_post.py', self.tmp_folder)
            self._execute_script(self.tmp_folder + '/_post.py',
                                 'Post-installation script')
            os.remove(self.tmp_folder + '/_post.py')

    def uninstall(self):
        logger.info('Uninstalling [%s-%s] package...' %
                    (self.name, self.version))

        # database items
        items = self.config_file.options('items')
        itemids = [self.config_file.get('items', x) for x in items]

        if itemids:

            @db.transactional(auto_commit=True)
            def _remove_items():
                for itemid in itemids:
                    item = db._db.get_item(itemid)
                    if item is not None:
                        logger.info('Removing object %s' % itemid)
                        item._delete()

            _remove_items()

        # uninstall script
        contents = self.package_file.getnames()
        if '_uninstall.py' in contents:
            logger.info('Running uninstallation script...')
            self.package_file.extract('_uninstall.py', self.tmp_folder)
            self._execute_script(self.tmp_folder + '/_uninstall.py',
                                 'Uninstall script')
            os.remove(self.tmp_folder + '/_uninstall.py')

        # files
        files = self.config_file.options('files')
        for fl in files:
            fname = self.config_file.get('files', fl)
            logger.info('Removing file ' + fname)
            if os.path.exists(fname):
                os.remove(fname)
            # check if it is a python file
            if fname[-3:] == '.py':
                [os.remove(fname + x)
                 for x in ('c', 'o')
                 if os.path.exists(fname + x)]

        # directories
        dirs = self.config_file.options('dirs')
        for dir in dirs:
            dir_path = self.config_file.get('dirs', dir)
            if os.path.exists(dir_path):
                logger.info('Removing directory ' + dir_path)
                shutil.rmtree(dir_path, True)

        # published dirs
        if '_pubdir.xml' in contents:
            logger.info('Uninstalling published directories...')
            dirsfile = self.package_file.extractfile('_pubdir.xml')
            _dom = minidom.parse(dirsfile)
            dirsConfig = configfiles.PubDirManager()
            dir_nodes = _dom.getElementsByTagName('dir')
            for dir_node in dir_nodes:
                #app_node = app_node.cloneNode(True)
                dir_name = dir_node.getAttribute('name')
                logger.info('Uninstalling published directory "%s"' % dir_name)
                old_node = dirsConfig.getDirNode(dir_name)
                if old_node:
                    dirsConfig.removeDirNode(old_node)
                else:
                    logger.warning('Published directory "%s" does not exist'
                                    % dir_name)
                # update published directories
                if dir_name in pubdirs.dirs:
                    del pubdirs.dirs[dir_name]
                    # remove published directory in multi-processing enviroments
                    services.notify(('REMOVE_PUBDIR', dir_name))

                dir_path = dir_node.getAttribute('path')
                if os.path.exists(dir_path):
                    shutil.rmtree(dir_path, True)

            _dom.unlink()
            dirsConfig.close(True)

    def create(self):
        # files
        files = self.config_file.options('files')
        for fl in files:
            fname = self.config_file.get('files', fl)
            logger.info('Adding file ' + fname)
            self.package_files.append((
                self.package_file.gettarinfo(fname, fname), fname))

        # directories
        dirs = self.config_file.options('dirs')
        for dir in dirs:
            dirname = self.config_file.get('dirs', dir)
            logger.info('Adding directory ' + dirname)
            self._addtree(dirname)

        # published directories
        if self.config_file.has_section('pubdir'):
            pubdirs = self.config_file.options('pubdir')
            dirsConfig = configfiles.PubDirManager()

            dir_nodes = []
            for dir in pubdirs:
                dirname = self.config_file.get('pubdir', dir)
                logger.info('Adding published directory "%s"' % dirname)
                dir_node = dirsConfig.getDirNode(dirname)
                if dir_node:
                        dir_nodes.append(dir_node)
                        dir_location = dir_node.getAttribute('path')
                        self._addtree(dir_location)
                else:
                    logger.warning('Published directory "%s" does not exist'
                                   % appname)

            if dir_nodes:
                dirsFile = open(self.tmp_folder + '/_pubdir.xml', 'w')
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
        for itemid in itemids:
            item = db._db.get_item(itemid)
            self._export_item(item)

        # scripts
        if self.config_file.has_option('scripts', 'preinstall'):
            preinstall = self.config_file.get('scripts', 'preinstall')
            logger.info('Adding pre-install script "%s"' % preinstall)
            self.package_files.append((
                self.package_file.gettarinfo(preinstall, '_pre.py'),
                preinstall))

        if self.config_file.has_option('scripts', 'postinstall'):
            postinstall = self.config_file.get('scripts', 'postinstall')
            logger.info('Adding post-install script "%s"' % postinstall)
            self.package_files.append((
                self.package_file.gettarinfo(postinstall, '_post.py'),
                postinstall))

        if self.config_file.has_option('scripts', 'uninstall'):
            uninstall = self.config_file.get('scripts', 'uninstall')
            logger.info('Adding uninstall script "%s"' % uninstall)
            self.package_files.append((
                self.package_file.gettarinfo(uninstall, '_uninstall.py'),
                uninstall))

        # definition file
        self.package_files.append((
                self.package_file.gettarinfo(self.ini_file, '_pkg.ini'),
                self.ini_file))

        # compact files
        logger.info('Compacting...')
        for tarinfo, fname in self.package_files:
            if tarinfo.isfile():
                self.package_file.addfile(tarinfo, open(fname, 'rb'))
                # remove temporary
                if fname[:len(self.tmp_folder)] == self.tmp_folder:
                    os.remove(fname)
            else:
                if type(fname) == str: #unicode
                    fname = fname.encode('utf-8')
                self.package_file.add(fname)
