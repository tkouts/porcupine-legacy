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
"Python 3 compatibility layer"

# types
try:
    # python 2.6
    str = unicode
except NameError:
    # python 3
    str = str

# functions
def get_func_name(f):
    try:
        func_name = f.__name__
    except AttributeError:
        func_name = f.func_name
    return func_name

def set_func_name(f, func_name):
    if hasattr(f, '__name__'):
        f.__name__ = func_name
    else:
        f.func_name = func_name

def get_func_doc(f):
    try:
        func_doc = f.__doc__
    except AttributeError:
        func_doc = f.func_doc
    return func_doc

def set_func_doc(f, func_doc):
    if hasattr(f, '__doc__'):
        f.__doc__ = func_doc
    else:
        f.func_doc = func_doc
