#==============================================================================
#  Copyright (c) 2010 Tassos Koutsovassilis, http://www.innoscript.org
#
#  Permission is hereby granted, free of charge, to any person obtaining a copy
#  of this software and associated documentation files (the "Software"), to
#  deal in the Software without restriction, including without limitation the
#  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
#  sell copies of the Software, and to permit persons to whom the Software is
#  furnished to do so, subject to the following conditions:
#
#  The above copyright notice and this permission notice shall be included in
#  all copies or substantial portions of the Software.
#
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
#  THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
#  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
#  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#==============================================================================
import re

from . import NormalTemplateError

_template_re = re.compile('\s*\{\#(template|t) (.*?)\}')
_include_re = re.compile('\{#include (.*?)\}')
_block_re = re.compile(
    '\{\#(def|define|d) (.*?)\}([\s\S]*?)\{\/\#(def|define|d)(.*?)\}')


def get_template_path(mt):
    match = _template_re.match(mt)
    if match is not None:
        return match.group(2)
    else:
        return None


def expand_includes(mt):
    include = _include_re.search(mt)
    while include:
        path = include.group(1)
        try:
            f = open(path)
            inc_text = f.read().decode('utf-8')
        except IOError:
            raise NormalTemplateError('cannot include "' + path + '"')

        f.close()

        mt = '%s%s%s' % (mt[:include.start()], inc_text, mt[include.end():])
        include = _include_re.search(mt)

    return mt


def extract_data(mt):
    data = {}

    def _handler(match):
        data[match.group(2)] = match.group(3)
        return ''

    return _block_re.sub(_handler, mt), data
