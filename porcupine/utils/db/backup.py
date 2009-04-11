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
"Porcupine server backup file class"
import tarfile
import os.path

class BackupFile(object):
    def __init__(self, fileName):
        self.__filename = fileName
        
    def addfiles(self, filelist):
        backupFile = tarfile.open(self.__filename, 'w')
        try:
            for fl in filelist:
                tarinfo = backupFile.gettarinfo(fl, os.path.basename(fl))
                backupFile.addfile(tarinfo, file(fl, 'rb'))
        finally:
            backupFile.close()
            
    def extractTo(self, path):
        backupFile = tarfile.open(self.__filename, 'r')
        try:
            for info in backupFile.getmembers():
                backupFile.extract(info, path)
        finally:
            backupFile.close()
