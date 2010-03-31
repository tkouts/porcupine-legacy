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
"Porcupine JSON-RPC 2.0 Library"
import json

from porcupine.core.rpc import BaseEncoder
from porcupine.utils.date import Date


def error(code, message, data, request_id):
    response = {'jsonrpc': '2.0',
                'error': {'code': code,
                          'message': message,
                          'data': data},
                'id': request_id}
    return json.dumps(response)


def _date_reviver(dct):
    if '__date__' in dct:
        return Date.from_iso_8601(dct['value'])
    return dct


def loads(s):
    request = json.loads(s, object_hook=_date_reviver)
    return (request['id'], request['params'])


def dumps(request_id, obj, encoding):
    response = {'jsonrpc': '2.0',
                'result': obj,
                'id': request_id}
    return json.dumps(response, cls=_JSONEncoder)


class _JSONEncoder(json.JSONEncoder, BaseEncoder):
    default = BaseEncoder.default
