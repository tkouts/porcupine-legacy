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
"""
Porcupine runtime services accessed by multiple processes
"""
import sys
import logging
import logging.handlers
try:
    import multiprocessing
    if sys.platform == 'win32':
        import multiprocessing.reduction
except ImportError:
    multiprocessing = None

from porcupine.db import _db
from porcupine.core.session import SessionManager
from porcupine.utils import misc
from porcupine.config.settings import settings

if multiprocessing:
    logger = multiprocessing.get_logger()
else:
    logger = logging.getLogger('serverlog')
_loghandler = logging.handlers.RotatingFileHandler(
    'log/server.log', 'a',
    int(settings['log']['maxbytes']),
    int(settings['log']['backups']))
if multiprocessing:
    _loghandler.setFormatter(logging.Formatter(settings['log']['mp_format']))
else:
    _loghandler.setFormatter(logging.Formatter(settings['log']['format']))

logger.addHandler(_loghandler)
logger.setLevel(int(settings['log']['level']))


def init_db(**kwargs):
    return _db.open(**kwargs)


def lock_db():
    _db.lock()


def unlock_db():
    _db.unlock()


def init_session_manager(init_expiration=True):
    return SessionManager.open(
        misc.get_rto_by_name(settings['sessionmanager']['interface']),
        int(settings['sessionmanager']['timeout']),
        init_expiration,
        **settings['sessionmanager']['params'])


def init_config():
    # check if config is inited
    if type(list(settings['requestinterfaces'].values())[0]) == str:
        # register request interfaces
        for key, value in settings['requestinterfaces'].items():
            settings['requestinterfaces'][key] = misc.get_rto_by_name(value)
        # register template languages
        for key, value in settings['templatelanguages'].items():
            settings['templatelanguages'][key] = misc.get_rto_by_name(value)
        # load published directories
        from porcupine.config import pubdirs


def close_db():
    _db.close()


def close_session_manager():
    SessionManager.close()


def close_config():
    pass
