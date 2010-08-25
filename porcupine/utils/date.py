# -*- coding: utf-8 -*-
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
"Porcupine Date class"

import time
import calendar

from porcupine.config.resources import Locale
from porcupine.config.resources import ResourceStrings
from porcupine.core.compat import str
from porcupine.utils import iso8601


class Date(object):
    """
    Porcupine Date class

    This class is a helper class for handling dates.

    @ivar value: Floating point number expressed in seconds since the epoch
    @type value: float
    """
    resources = ResourceStrings({
        '*': Locale({
            # dates
            'DAYS': ['Monday',
                     'Tuesday',
                     'Wednesday',
                     'Thursday',
                     'Friday',
                     'Saturday',
                     'Sunday'],
            'MONTHS': ['January',
                       'February',
                       'March',
                       'April',
                       'May',
                       'June',
                       'July',
                       'August',
                       'September',
                       'October',
                       'November',
                       'December'],
            'AM': 'AM',
            'PM': 'PM',
        }),
        'el': Locale({
            # dates
            'DAYS': ['Δευτέρα',
                     'Τρίτη',
                     'Τετάρτη',
                     'Πέμπτη',
                     'Παρασκευή',
                     'Σάββατο',
                     'Κυριακή'],
            'MONTHS': ['Ιανουάριος',
                       'Φεβρουάριος',
                       'Μάρτιος',
                       'Απρίλιος',
                       'Μάϊος',
                       'Ιούνιος',
                       'Ιούλιος',
                       'Αύγουστος',
                       'Σεπτέμβριος',
                       'Οκτώβριος',
                       'Νοέμβριος',
                       'Δεκέμβριος'],
            'AM': 'πμ',
            'PM': 'μμ',
        })
    })

    def __init__(self, fTime=None):
        """
        @param fTime: a floating point number expressed
            in seconds since the epoch, in UTC. If ommited
            the current time is used.
        @type fTime: float
        """
        self.value = fTime or time.time()

    def __eq__(self, other):
        if isinstance(other, Date):
            return self.value == other.value
        else:
            return self.value == other

    def __ne__(self, other):
        if isinstance(other, Date):
            return self.value != other.value
        else:
            return self.value != other

    def __lt__(self, other):
        if isinstance(other, Date):
            return self.value < other.value
        else:
            return self.value < other

    def __gt__(self, other):
        if isinstance(other, Date):
            return self.value > other.value
        else:
            return self.value > other

    def __le__(self, other):
        if isinstance(other, Date):
            return self.value <= other.value
        else:
            return self.value <= other

    def __ge__(self, other):
        if isinstance(other, Date):
            return self.value >= other.value
        else:
            return self.value >= other

    __hash__ = object.__hash__

    def format(self, format, locale='*'):
        """
        Convert the date to a string as specified by the format argument.

        @param format: The following directives can be embedded in the
                       format string::

                -yyyy  four digit year
                -yy    two digit year
                -month full month
                -mmm   short month
                -mm    month as a decimal number
                -dd    day of the month as a decimal number
                -day   full week day
                -ddd   short week day
                -h24   24-based hours
                -h12   12-based hours
                -min   minutes
                -sec   seconds
                -MM    locale's AM or PM
        @type format: str
        @param locale: The locale string. If ommited the '*' is used.
        @type locale: str

        @return: The formatted string
        @rtype: str
        """
        tupTime = time.localtime(self.value)
        sYear = str(tupTime[0])
        iMonth = tupTime[1] - 1
        iDate = tupTime[2]
        iHours = tupTime[3]
        if iHours > 12:
            iHours12 = iHours - 12
            ampm = self.resources.get_resource('PM', locale)
        else:
            iHours12 = iHours
            ampm = self.resources.get_resource('AM', locale)
        if type(ampm) == bytes:
            # python 2.6
            ampm = ampm.decode('utf-8')

        iMins = tupTime[4]
        iSecs = tupTime[5]
        iWeekday = tupTime[6]

        sMonth = self.resources.get_resource('MONTHS', locale)[iMonth]
        if type(sMonth) == bytes:
            # python 2.6
            sMonth = sMonth.decode('utf-8')

        sDay = self.resources.get_resource('DAYS', locale)[iWeekday]
        if type(sDay) == bytes:
            # python 2.6
            sDay = sDay.decode('utf-8')

        format = format.replace('yyyy', sYear)
        format = format.replace('yy', sYear[2:4])

        format = format.replace('month', sMonth)
        format = format.replace('mmm', sMonth[:3])
        format = format.replace('mm', str(iMonth + 1))

        format = format.replace('min', '%02d' % iMins)
        format = format.replace('sec', '%02d' % iSecs)

        format = format.replace('ddd', sDay[:3])
        format = format.replace('dd', str(iDate))
        format = format.replace('day', sDay)

        format = format.replace('h24', '%02d' % iHours)
        format = format.replace('h12', str(iHours12))
        format = format.replace('MM', ampm)

        return format

    def to_iso_8601(self):
        """
        This method formats the date in the Iso8601 format

        Sample output C{'2004-01-29T18:00:12Z'}

        @rtype: str
        """
        tup_time = time.gmtime(self.value)
        return '%04i-%02i-%02iT%02i:%02i:%02iZ' % tup_time[:6]

    @staticmethod
    def from_iso_8601(s):
        """
        Convert an Iso8601 string to a L{Date} object.

        @param s: an Iso8601 formatted string
        @type s: str

        @rtype: L{Date}
        """
        date_time = iso8601.parse_date(s)
        date = Date(float(calendar.timegm(date_time.utctimetuple())))
        return date
