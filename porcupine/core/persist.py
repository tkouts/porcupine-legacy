#===============================================================================
#    Copyright 2005-2009 Tassos Koutsovassilis
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
"Porcupine object persistence layer"
try:
    # python 2.6
    from cStringIO import StringIO
except ImportError:
    # python 3
    from io import StringIO

try:
    # python 2.6
    import cPickle as pickle
except ImportError:
    # python 3
    import pickle

def loads(value):
    return pickle.loads(value)

def dumps(obj):
    f = StringIO()
    pickler = pickle.Pickler(f, 2)
    pickler.fast = True
    pickler.dump(obj)
    stream = f.getvalue()
    f.close()
    return stream