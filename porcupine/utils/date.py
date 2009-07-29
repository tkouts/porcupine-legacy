# -*- coding: utf-8 -*-
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
"Porcupine Date class"

import time

from porcupine.config.resources import Locale
from porcupine.config.resources import ResourceStrings
from porcupine.core.decorators import deprecated

class Date(object):
    """
    Porcupine Date class
    
    This class is a helper class for handling dates.
    
    @ivar value: Floating point number expressed in seconds since the epoch
    @type value: float
    """
    resources = ResourceStrings({
        '*' : Locale({
            # dates
            'DAYS' : ['Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                      'Sunday'],
            'MONTHS' : ['January',
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
            'AM' : 'AM',
            'PM' : 'PM',
        }),
        'el' : Locale({
            # dates 
            'DAYS' : ['Δευτέρα',
                      'Τρίτη',
                      'Τετάρτη',
                      'Πέμπτη',
                      'Παρασκευή',
                      'Σάββατο',
                      'Κυριακή'],
            'MONTHS' : ['Ιανουάριος',
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
            'AM' : 'πμ',
            'PM' : 'μμ',
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

    def __cmp__(self, other):
        if isinstance(other, Date):
            return cmp(self.value, other.value)
        else:
            return cmp(self.value, other)

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
        iMonth = tupTime[1]-1
        iDate = tupTime[2]
        iHours = tupTime[3]
        if iHours>12:
            iHours12 = iHours - 12
            ampm = self.resources.get_resource('PM', locale)
        else:
            iHours12 = iHours
            ampm = self.resources.get_resource('AM', locale)
        iMins = tupTime[4]
        iSecs = tupTime[5]
        iWeekday = tupTime[6]

        months = self.resources.get_resource('MONTHS', locale)
        days = self.resources.get_resource('DAYS', locale)
        
        format = format.replace('yyyy', sYear)
        format = format.replace('yy', sYear[2:4])
        
        format = format.replace('month', months[iMonth])
        format = format.replace('mmm', unicode(months[iMonth],
                                               'utf-8')[0:3].encode('utf-8'))
        format = format.replace('mm', str(iMonth + 1))
        
        format = format.replace('min', '%02d' % iMins)
        format = format.replace('sec', '%02d' % iSecs)
        
        format = format.replace('ddd', unicode(days[iWeekday],
                                'utf-8')[0:3].encode('utf-8'))
        format = format.replace('dd', str(iDate))
        format = format.replace('day', days[iWeekday])
        
        format = format.replace('h24', '%02d' % iHours)
        format = format.replace('h12', str(iHours12))
        format = format.replace('MM', ampm)
        
        return format

    def to_iso_8601(self):
        """
        This method formats the date in the Iso8601 format
        
        Sample output C{'2004-01-29T18:00:12'}

        @rtype: str
        """
        tupTime = time.localtime(self.value)
        return('%04i-%02i-%02iT%02i:%02i:%02i' % tupTime[:6])
    toIso8601 = deprecated(to_iso_8601)

    #@staticmethod
    def from_iso_8601(s):
        """
        Convert an Iso8601 string to a L{Date} object.

        @param s: an Iso8601 formatted string
        @type s: str

        @rtype: L{Date}
        """
        tupTime = time.strptime(s, "%Y-%m-%dT%H:%M:%S")
        return Date(time.mktime(tupTime))
    fromIso8601 = staticmethod(deprecated(from_iso_8601))
    from_iso_8601 = staticmethod(from_iso_8601)
