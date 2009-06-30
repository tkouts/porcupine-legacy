#!/usr/bin/env python
"Utility for initializing the server database"
import sys

from porcupine.administration import offlinedb
from porcupine.utils.db import initialize_db
from porcupine.utils.misc import freeze_support

def init_db():
    import org.innoscript.desktop.schema.security
    # create system user
    system = org.innoscript.desktop.schema.security.SystemUser()
    system._id = 'system'
    system.displayName.value = 'SYSTEM'
    system._isSystem = True
    system.description.value = 'System account'
    try:
        # open offline db handle
        db = offlinedb.get_handle(system)
    except Exception, e:
        sys.exit(e)
    initialize_db()
    db.close()

if __name__ == '__main__':
    freeze_support()

    answer = raw_input('''WARNING: Please ensure that Porcupine Server is stopped!
All objects will be erased!
Are you sure you want to initialize the database(Y/N)?''')

    if (answer.upper() == 'Y'):
        init_db()
        sys.stdout.write('Store initialization completed successfully.\n')
