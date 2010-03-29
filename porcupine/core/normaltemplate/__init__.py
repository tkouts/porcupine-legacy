#===============================================================================
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
#===============================================================================
import re
from cgi import escape
from xml.sax.saxutils import quoteattr

try:
    # python 2.x
    from urllib import quote
except ImportError:
    # python 3
    from urllib.parse import quote

__all__ = ['__version__', 'compile', 'filters']
__version__ = '0.1'

_token_re = re.compile('(\{.+?\}\}?)')
_command_re = re.compile('^\{[\:\/\=]')
_xpath_invalid_chars = re.compile('\||;|\$|~')
_tab_size = 2

try:
    # python 2.x
    _str_filter = unicode
except NameError:
    # python 3
    _str_filter = str

class NormalTemplateError(Exception):
    "normal-template error class"
    pass

def _xpath(path):
    if _xpath_invalid_chars.search(path):
        raise NormalTemplateError("Invalid characters in path '%s'" % path)

    # strip quotes and replace '/' with '.'
    path = re.sub('\'|"', '', path.replace('/', '.'))

    if path == '.':
        return 'd'
    elif path.startswith('.'):
        return 'data%s' % _dict_get(path[1:])
    else:
        return 'd%s' % _dict_get(path)

def _dict_get(path):
    keys = path.split('.')
    if len(keys) > 1:
        snippet = ['.get("%s", {})' % key for key in keys[:-1]]
    else:
        snippet = []
    snippet.append('.get("%s", None)' % keys[-1])
    return ''.join(snippet)

def _unbalanced(tag, expected):
    err_msg = 'Unbalanced "%s" close tag' % tag
    if expected:
        err_msg += ', expecting "%s" close tag' % expected
    raise NormalTemplateError(err_msg)

def _normal_wrapper(fn, filters):
    def nt(data):
        return fn(data, filters)
    return nt

# Template filters. Add your own to this dictionary.
filters = {
    'str'   : _str_filter,
    'html'  : escape,
    'attr'  : quoteattr,
    'uri'   : quote
}

_compile = compile

def compile(src, options={}, template_name='normal-template'):
    code = ['def nt(data, filters):',
            '%sd = data' % (_tab_size * ' '),
            '%sres = []' % (_tab_size * ' ')]
    
    stack = ['data']
    nesting = ['']
    tokens = _token_re.split(src)

    if options and 'filters' in options:
        _filters = options['filters']
        _filters.update(filters)
    else:
        _filters = filters.copy()

    if 'defaultfilter' not in _filters:
        _filters['defaultfilter'] = _str_filter

    code.append('%sdf = filters["defaultfilter"]' % (_tab_size * ' '))

    for token in tokens:
        if token == '':
            continue
        
        intend = _tab_size * len(nesting) * ' '

        if _command_re.match(token):

            if token[1] == ':': # open tag
                cmd, arg = (token[2:-1].split(' ') + [None])[:2]

                if cmd == 'if':
                    val = _xpath(arg)
                    code.append('%sif %s:' % (intend, val))
                    nesting.append('if')
                    continue

                elif cmd in ('s', 'select'):
                    val = _xpath(arg)
                    code.append('%sd = %s' % (intend, val))
                    code.append('%sif d is not None:' % intend)
                    nesting.append('select')
                    stack.append(re.sub('^d\.', stack[0] + '.', val))
                    continue

                elif cmd in ('r', 'reduce'):
                    val = _xpath(arg)
                    depth = len(stack)
                    code.append('%sa%d = %s' % (intend, depth, val))
                    code.append('%sif a%d is not None and len(a%d) > 0:' %
                                (intend, depth, depth))
                    code.append('%sfor i%d, d in enumerate(a%d):' %
                                (intend + _tab_size * ' ', depth, depth))
                    nesting.append('reduce')
                    nesting.append('reduce')
                    stack.append('a%d[i%d]' % (depth, depth))
                    continue

                elif cmd in ('e', 'else'):
                    tag = nesting[-1]
                    if tag:
                        if tag == 'reduce':
                            unindent = _tab_size * 2
                        else:
                            unindent = _tab_size
                        code.append('%selse:' % intend[:-unindent])
                    else:
                        raise NormalTemplateError('Unbalanced "else" tag')
                    continue

                elif cmd == 'lb': # output left curly bracket '}'
                    code.append('%sres.append("{")' % intend)
                    continue

                elif cmd == 'rb': # output right curly bracket '}'
                    code.append('%sres.append("}")' % intend)
                    continue

                elif cmd == '!': # comment
                    continue

            elif token[1] == '/': # close tag
                if token[2] == ':':
                    cmd = token[3:-1].split(' ')[0]
                    tag = nesting.pop()

                    if cmd == 'if':
                        if tag != 'if':
                            _unbalanced('if', tag)
                        continue

                    elif cmd in ('s', 'select'):
                        if tag == 'select':
                            stack.pop()
                            code.append('%sd = %s' % (intend, stack[-1]))
                        else:
                            _unbalanced('select', tag)
                        continue

                    elif cmd in ('r', 'reduce'):
                        tag = nesting.pop()
                        if tag == 'reduce':
                            stack.pop()
                            code.append('%sd = %s' % (intend, stack[-1]))
                        else:
                            _unbalanced('reduce', tag)

            elif token[1] == '=': # interpolation
                parts = token[2:-1].split(' ')
                pre = ''
                post = ''
                for part in parts[:-1]:
                    pre += 'filters["%s"](' % part
                    post += ')'

                if pre == '':
                    if 'defaultfilter' in _filters:
                        pre = 'df('
                        post = ')'

                code.append('%sv = %s' % (intend, _xpath(parts[-1])))
                code.append('%sif v is not None:' % intend)
                code.append('%sres.append(%sv%s)' % (intend + _tab_size * ' ',
                                                     pre, post))
                continue

        else: # plain text
            code.append('%sres.append(%r)' % (intend, token))

    if len(nesting) > 1:
        raise NormalTemplateError('Unbalanced "%s" tag, is not closed' %
                                  nesting[-1])

    code.append('%sreturn "".join(res)' % (_tab_size * ' '))

    code = '\n'.join(code)

    # compile function
    namespace = {}
    code = _compile(code, template_name, "exec")
    exec(code, namespace)
    fn = namespace['nt']

    return _normal_wrapper(fn, _filters)
