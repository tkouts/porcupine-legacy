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
"Server string localization classes"

class Locale(dict):
    """This is a special dict type.
    When a non existing key is requested instead
    of raising a I{KeyError} exception, the key itself
    is returned.
    """
    def __getitem__(self, key):
        return self.get(key, key)

class ResourceStrings(object):
    "This type is used for keeping localized string bundles."
    def __init__(self, dctResources):
        """@param dctResources: A Python dictionary. The keys of this
        dictionary must be the locale strings as these are defined in the
        "Accept-Language" HTTP header (de, fr, us etc.). This dictionary
        MUST also have a "*" key. This is the default locale, used when
        the locale provided is not included.
        The values must be instances of the L{Locale} type.
        @type dctResources: dict
        """
        self.__resources = dctResources

    def getResource(self, sName, sLocale):
        """Returns the string with the specified name in the
        given locale.
        
        @param sName: The name of the string resource.
        @type sName: str
        
        @param sLocale: The name of the locale.
        @type sLocale: str
        
        @return: str
        """
        dctLocale = self.__resources.setdefault(sLocale, self.__resources['*'])
        return dctLocale[sName]
        
    def getLocale(self, sLocale):
        """Returns the requested locale object. If the
        locale does not exist then the "*" locale is
        returned.
        
        @param sLocale: The name of the locale.
        @type sLocale: str

        @return: L{Locale}
        """
        return self.__resources.setdefault(sLocale, self.__resources['*'])

