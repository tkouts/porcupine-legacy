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
Web methods for the root folder class
"""
import os
import base64

from porcupine import db
from porcupine import context
from porcupine import webmethods
from porcupine import filters

from porcupine.oql import command
from org.innoscript.desktop.schema.common import RootFolder


@filters.runas('system')
@webmethods.remotemethod(of_type=RootFolder)
def login(self, username, password):
    "Remote method for authenticating users"
    users_container = db.get_item('users')
    user = users_container.get_child_by_name(username)
    if user and hasattr(user, 'authenticate'):
        if user.authenticate(password):
            context.session.userid = user.id
            return True
    return False


@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=RootFolder, isPage=True,
                   template='../ui.LoginPage.quix')
def login(self):
    "Displays the login page"
    return {
        'URI': context.request.SCRIPT_NAME or '.'}


@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=RootFolder,
                   template='../ui.Dlg_LoginAs.quix')
def loginas(self):
    "Displays the login as dialog"
    return {
        'URI': context.request.SCRIPT_NAME + '/?cmd=login'}


@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=RootFolder,
                   max_age=1200,
                   template='../ui.AboutDialog.quix')
def about(self):
    "Displays the about dialog"
    return {'VERSION': context.server.version}


@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=RootFolder,
                   template='../ui.Dlg_UserSettings.quix',
                   template_engine='normal_template')
def user_settings(self):
    "Displays the user settings dialog"
    settings = context.user.settings
    taskbar_pos = settings.value.setdefault('TASK_BAR_POS', 'bottom')

    params = {'TASK_BAR_POS': taskbar_pos}

    if taskbar_pos == 'bottom':
        params['CHECKED_TOP'] = 'false'
        params['CHECKED_BOTTOM'] = 'true'
    else:
        params['CHECKED_TOP'] = 'true'
        params['CHECKED_BOTTOM'] = 'false'

    autoRun = settings.value.get('AUTO_RUN', '')

    if settings.value.get('RUN_MAXIMIZED', False):
        params['RUN_MAXIMIZED_VALUE'] = 'true'
    else:
        params['RUN_MAXIMIZED_VALUE'] = 'false'

    # get applications
    sOql = ("select displayName, launchUrl, icon," +
            "(if launchUrl = $L then 'true' else '') as selected " +
            "from 'apps' order by displayName asc")
    params['APPS'] = command.execute(sOql, {'L': autoRun})

    params['AUTO_RUN_NONE'] = ''
    if autoRun == '':
        params['AUTO_RUN_NONE'] = 'true'

    return params


@filters.runas('system')
@webmethods.remotemethod(of_type=RootFolder)
@db.transactional(auto_commit=True)
def applySettings(self, data):
    "Saves user's preferences"
    activeUser = context.original_user
    for key in data:
        activeUser.settings.value[key] = data[key]
    activeUser.update()
    return True


@webmethods.webmethod(of_type=RootFolder,
                      max_age=1200,
                      template='../browsernotsuppoted.htm')
def __blank__(self):
    "Displays the browser not supported HTML page"
    return {
        'USER_AGENT': context.request.HTTP_USER_AGENT}


@filters.requires_login('/?cmd=login')
@filters.i18n('org.innoscript.desktop.strings.resources')
@webmethods.quixui(of_type=RootFolder,
                   isPage=True,
                   template='../ui.Desktop.quix',
                   template_engine='normal_template')
def __blank__(self):
    "Displays the desktop"
    oUser = context.user
    params = {
        'USER': oUser.displayName.value,
        'ROOT_NAME': self.displayName.value,
        'AUTO_RUN': '',
        'RUN_MAXIMIZED': 0,
        'SETTINGS_DISABLED': '',
        'LOGOFF_DISABLED': ''}
    if hasattr(oUser, 'authenticate'):
        settings = oUser.settings
        params['AUTO_RUN'] = \
            settings.value.setdefault('AUTO_RUN', '')
        params['RUN_MAXIMIZED'] = \
            int(settings.value.setdefault('RUN_MAXIMIZED', False))
        taskbar_position = \
            settings.value.get('TASK_BAR_POS', 'bottom')
    else:
        taskbar_position = 'bottom'
        params['SETTINGS_DISABLED'] = 'true'
        params['LOGOFF_DISABLED'] = 'true'

    params['REPOSITORY_DISABLED'] = 'true'
    params['PERSONAL_FOLDER'] = ''
    if hasattr(oUser, 'personalFolder'):
        params['REPOSITORY_DISABLED'] = 'false'
        params['PERSONAL_FOLDER'] = oUser.personalFolder.value

    # has the user access to recycle bin?
    rb = db.get_item('rb')
    if rb:
        params['RB_NAME'] = rb.displayName.value
    else:
        params['RB_NAME'] = None

    params['BOTTOM'] = taskbar_position == 'bottom'
    params['TOP'] = not params['BOTTOM']

    # get applications
    sOql = "select launchUrl, displayName, icon from 'apps' " + \
           "order by displayName asc"
    params['APPS'] = command.execute(sOql)

    return params


@webmethods.remotemethod(of_type=RootFolder)
def executeOqlCommand(self, cmd, vars={}):
    return command.execute(cmd, vars)


@webmethods.remotemethod(of_type=RootFolder)
def logoff(self):
    context.session.terminate()
    return True


@filters.requires_policy('uploadpolicy')
@webmethods.remotemethod(of_type=RootFolder)
def upload(self, chunk, fname):
    chunk = base64.decodestring(chunk)
    if not fname:
        fileno, fname = context.session.getTempFile()
        os.write(fileno, chunk)
        os.close(fileno)
        fname = os.path.basename(fname)
    else:
        tmpfile = open(context.server.temp_folder + '/' + fname, 'ab+')
        tmpfile.write(chunk)
        tmpfile.close()
    return fname


@filters.requires_policy('uploadpolicy')
@webmethods.webmethod(of_type=RootFolder, http_method='POST',
                      content_type='plain/text')
def http_upload(self):
    form = context.request.form
    file_data = form['Filedata']
    fname = file_data.filename
    data = file_data.value
    fileno, fname = context.session.getTempFile()
    os.write(fileno, data)
    os.close(fileno)
    temp_file = os.path.basename(fname)
    context.response.write(temp_file)
