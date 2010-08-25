#==============================================================================
#   Copyright (c) 2005-2010, Tassos Koutsovassilis
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
"""
OQL command execution
"""
#import cProfile

from porcupine import exceptions
from porcupine.core import cache
from porcupine.core.oql import parser, core
from porcupine.core.runtime import logger

_QUERY_CACHE = cache.Cache(100)


def execute(script, oql_vars={}):
    if script:
        try:
            if script in _QUERY_CACHE:
                prepared = _QUERY_CACHE[script]
            else:
                p = parser.OqlParser()
                ast = p.parse(script)
                prepared = core.prepare(ast)
                _QUERY_CACHE[script] = prepared
            #result = []
            #cProfile.runctx('result = core.execute()', globals(), locals())
            result = core.execute(prepared, oql_vars)

        except SyntaxError as e:
            lineno = e.args[1]
            errvalue = e.args[2]
            script_lines = script.split('\n')

            if lineno == 0:
                lineno = len(script_lines)
                errvalue = 'Unexpected end of OQL script'
            else:
                lineno = 1
                for line in script_lines:
                    if errvalue in line:
                        break
                    lineno += 1

            script_lines = ['   ' + ln for ln in script_lines]
            script_lines[lineno - 1] = '->' + script_lines[lineno - 1][2:]
            helper_string = '\n'.join(script_lines)
            error_string = '%s\n\n%s' % (
                helper_string,
                "OQL syntax error at line %d: '%s'" % (lineno, errvalue))
            raise exceptions.OQLError(error_string)

        if len(result) == 1:
            result = result[0]

        return result


class OqlCommand(object):
    """
    Deprecated class

    For executing OQL queries use:
    C{
        from porcupine.oql import command
        command.execute(cmd, vars)
    }
    """
    def __init__(self):
        logger.warning(
            "DEPRECATION WARNING\n" +
            "OqlCommand is deprecated.\n" +
            "Use \"porcupine.oql.command.execute\" instead.")

    def execute(self, oql_script, oql_vars={}):
        return execute(oql_script, oql_vars)
