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
"Porcupine Python Server Pages"

import os
import re
import marshal

from porcupine import exceptions

PSP_TAGS = re.compile('(<%.*?%>)', re.DOTALL)
PSP_DECREASE_INDENT = re.compile('else|elif|except|finally')
PSP_REMOVE_EXTENSION = re.compile('(.*)\.(.*)')
NT_UTF_8_IDENTIFIER = chr(239) + chr(187) + chr(191)

def execute(context, filename):
    try:
        # get modification date
        sMod = os.stat(filename)[8]
    except OSError:
        raise exceptions.NotFound(
            'The file "%s" can not be found' % filename)
    
    sMod = hex(sMod)[2:]

    sFileWithoutExtension = re.search(PSP_REMOVE_EXTENSION, filename).groups()[0]
    compiledFileName = sFileWithoutExtension + '#' + sMod + '.bin'
    
    try:
        pspBinaryFile = open(compiledFileName, 'rb')
    except IOError:
        # remove old compiled files
        import glob
        oldFiles = glob.glob(sFileWithoutExtension + '*.bin')
        for oldFile in oldFiles:
            os.remove(oldFile)
        # start compilation
        oFile = open(filename, 'rU')
        pspCode = oFile.read()

        # truncate utf-8 file encoding identifier for NT            
        if pspCode[:3] == NT_UTF_8_IDENTIFIER:
            pspCode = pspCode[3:]
        
        execCode=''

        pspCode = re.split(PSP_TAGS, pspCode)
        intend = ''
        for codeFragment in pspCode:
            if codeFragment!='':
                codeMatch = re.match(PSP_TAGS, codeFragment)
                if codeMatch == None:
                    # pure HTML
                    # remove whitespaces
                    #codeFragment = codeFragment.strip() + '\n'
                    codeFragment = codeFragment.replace("'", "\\'")
                        
                    execCode += intend + 'Response.write(\'\'\'%s\'\'\')\n' % codeFragment
                else:
                    # pure Python
                    # remove PSP tags
                    codeFragment = codeFragment[2:len(codeFragment)-2]
                    linesOfCode = codeFragment.split('\n')
                    formattedCode = ''
                    for line in linesOfCode:
                        # remove whitespaces
                        line = line.strip()
                        # set intendation
                        if line!='':
                            if line!='end':
                                if re.match(PSP_DECREASE_INDENT, line) != None:
                                    intend = intend[0:len(intend)-1]
                                formattedCode += intend + line + '\n'
                                if line[-1] == ':':
                                    intend += '\t'
                            else:
                                intend = intend[0:len(intend)-1]
                    execCode += formattedCode
        
        oCode = compile(execCode, '<string>', 'exec')
        pspBinaryFile = open(compiledFileName, 'w+b')
        marshal.dump(oCode, pspBinaryFile)
        pspBinaryFile.seek(0)

    pspDir = {
        'Server'    :context.server,
        'Session'   :context.session,
        'Response'  :context.response,
        'Request'   :context.request,
#        'item'      :self.item,
#        'include'   :self.include,
#        'servlet'   :self
    }
    oCode = marshal.load(pspBinaryFile)
    try:
        exec oCode in pspDir
    finally:
        pspBinaryFile.close()
