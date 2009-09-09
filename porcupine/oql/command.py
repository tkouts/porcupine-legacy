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
OQL command object
"""
#import cProfile

from porcupine import exceptions
from porcupine.core.oql import parser, core

class OqlCommand(object):
    def __init__(self):
        self.__ast = []
        self.oql_vars = {}
        
    def __parse(self, script):
        if script:
            p = parser.OqlParser()
            self.__ast = p.parse(script)

    def _execute(self):
        result = []
        for cmd in self.__ast:
            cmd_code, args = cmd
            cmd_handler = getattr(core, 'h_%s' % cmd_code)
            ret = cmd_handler(args, self.oql_vars)
            if ret is not None:
                result.append(ret)
        return result

    def execute(self, oql_script):
        try:
            self.__parse(oql_script)
            #ret = []
            #cProfile.runctx('ret = self._execute()', globals(), locals())
            ret = self._execute()
        
        except SyntaxError as e:
            lineno = e[1]
            errvalue = e[2]
            script_lines = oql_script.split('\n')
            if lineno == 0:
                lineno = len(script_lines)
                errvalue = 'Unexpected end of OQL script'
            script_lines = ['   ' + ln for ln in script_lines]
            script_lines[lineno - 1] = '->' + script_lines[lineno - 1][2:]
            helper_string = '\n'.join(script_lines)
            error_string = '%s\n\n%s' % (helper_string,
                                         "OQL syntax error at line %d: '%s'" % \
                                         (lineno, errvalue))
            raise exceptions.OQLError(error_string)
        except TypeError as e:
            raise exceptions.InternalServerError(e.args[0])
        
        if len(ret) == 1:
           ret = ret[0]
        
        return ret
