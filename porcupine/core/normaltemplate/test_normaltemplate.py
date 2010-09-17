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
import unittest
try:
    from . import NormalTemplateError, compile, filters
except ValueError:
    from __init__ import NormalTemplateError, compile, filters


class NormalTemplateTestCases(unittest.TestCase):
    def test_interpolation(self):
        t = compile('Hello {=name}, {=article/title} {=article/deep/value}')
        data = {'name': 'George',
                'article': {'title': 'News',
                            'content': 'No news is good news',
                            'deep': {'value': 'found'}}}
        self.assertEqual('Hello George, News found', t(data))

    def test_comments(self):
        t = compile('Hello {:! this is a comment }Stella')
        data = {}
        self.assertEqual('Hello Stella', t(data))

    def test_select(self):
        t = compile('Hello {:select user}{=name}, {=age}{/:select}')
        data = {'user': {'name': 'George',
                         'age': '34'}}
        self.assertEqual('Hello George, 34', t(data))

        t = compile('Hello {:s deep/user}{=name}, {=age}{/:s}')
        data = {'deep': {'user': {'name': 'Stella',
                                  'age': '34'}}}
        self.assertEqual('Hello Stella, 34', t(data))

    def test_reduce(self):
        t = compile('{:r articles}{=title}: {=content} {/:r}')
        data = {'articles': [{'title': 'Hello1', 'content': 'World1'},
                             {'title': 'Hello2', 'content': 'World2'},
                             {'title': 'Hello3', 'content': 'World3'}]}
        self.assertEqual('Hello1: World1 Hello2: World2 Hello3: World3 ',
                         t(data))

        t = compile('test {:r articles}{=title}: {=content} {/:r}')
        data = {'articles': []}
        self.assertEqual('test ', t(data))

        t = compile('test {:r articles}{=title}: {=content} {/:r}')
        data = {}
        self.assertEqual('test ', t(data))

    def test_curly(self):
        t = compile('Hello {=name}, function() { var a = 1 + 2 }')
        data = {'name': 'George'}
        self.assertEqual('Hello George, function() { var a = 1 + 2 }', t(data))

    def test_if_else(self):
        t = compile('{:if cool}cool {=outer}{:e}not cool{/:if}')
        data = {}
        self.assertEqual('not cool', t(data))
        data = {'cool': 'ok', 'outer': 'this is outer'}
        self.assertEqual('cool this is outer', t(data))

    def test_select_else(self):
        t = compile('{:s cool}cool{:e}not cool{/:s}')
        data = {}
        self.assertEqual('not cool', t(data))

    def test_interpolate_none(self):
        t = compile('Hello {=value}')
        data = {'value': 0}
        self.assertEqual('Hello 0', t(data))

    def test_dot(self):
        t = compile('{:s cool}{=.}{:e}not cool{/:s}')
        data = {'cool': 34}
        self.assertEqual('34', t(data))

    def test_reduce_else(self):
        t = compile('{:r articles}<li>{=title}: {=content}</li>'
                    '{:e}no articles{/:r}')
        data = {'articles': [{'title': 'Hello1', 'content': 'World1'},
                             {'title': 'Hello2', 'content': 'World2'},
                             {'title': 'Hello3', 'content': 'World3'}]}
        self.assertEqual('<li>Hello1: World1</li><li>Hello2: World2</li>'
                         '<li>Hello3: World3</li>', t(data))

        data = {}
        self.assertEqual('no articles', t(data))

        data = {'articles': []}
        self.assertEqual('no articles', t(data))

    def test_select_reduce_else(self):
        t = compile('{:s articles}{:r .}<li>{=title}: {=content}</li>{/:r}'
                    '{:e}no articles{/:s}')
        data = {'articles': [{'title': 'Hello1', 'content': 'World1'},
                             {'title': 'Hello2', 'content': 'World2'},
                             {'title': 'Hello3', 'content': 'World3'}]}
        self.assertEqual('<li>Hello1: World1</li><li>Hello2: World2</li>'
                         '<li>Hello3: World3</li>', t(data))

        data = {}
        self.assertEqual('no articles', t(data))

    def test_default_filter(self):
        t = compile('{=name}',
                    {'filters': {'defaultfilter': filters['html']}})
        data = {'name': "George >> 2"}
        self.assertEqual('George &gt;&gt; 2', t(data))

    def test_custom_filter(self):
        t = compile("{=upcase name}",
                    {'filters': {'upcase': lambda x: x.upper()}})
        data = {'name': 'George'}
        self.assertEquals('GEORGE', t(data))

    def test_multiple_filters(self):
        t = compile('{=lispy upcase name}', {
                    'filters': {'upcase': lambda x: x.upper(),
                                'lispy': lambda x: '((%s))' % x}})
        data = {'name': 'George'}
        self.assertEquals('((GEORGE))', t(data))

    def test_newlines(self):
        t = compile('hello\n {=name}\nworld\n')
        data = {'name': 'George'}
        self.assertEquals('hello\n George\nworld\n', t(data))

    def test_quotes(self):
        t = compile('hello "{=name}", how "are" you?')
        data = {'name': "George"}
        self.assertEquals('hello "George", how "are" you?', t(data))

    def test_curly_brackets(self):
        t = compile('enclose in {:lb}brackets{:rb}')
        data = {}
        self.assertEquals('enclose in {brackets}', t(data))

    def test_syntax_errors(self):
        self.failUnlessRaises(NormalTemplateError, compile,
                              '{/:s articles}articles')
        self.failUnlessRaises(NormalTemplateError, compile,
                              '{:if user}{:s articles}articles{/:if}')
        self.failUnlessRaises(NormalTemplateError, compile,
                              '{:if user}{:s articles}articles')

    def test_if_boolean(self):
        t = compile('{:if bool}true{:e}not true{/:if}')
        data = {'bool': False}
        self.assertEquals('not true', t(data))

    def test_intepolation_escaping(self):
        self.failUnlessRaises(NormalTemplateError, compile,
                              'hello {=name|test}')
        self.failUnlessRaises(NormalTemplateError, compile,
                              'hello {=name;test}')

    def test_json_interpolation(self):
        t = compile('{"id": "{=id}"}')
        data = {'id': '25'}
        self.assertEquals('{"id": "25"}', t(data))

    def test_backslash_escaping(self):
        t = compile('if (/\\/fora\\/topics/.test(e.target.href)) {')
        data = {}
        self.assertEquals('if (/\\/fora\\/topics/.test(e.target.href)) {',
                          t(data))

    def test_reduce_select_interpolate(self):
        t = compile(
            '{:r articles}{=title} {:s forum}{=title}{/:s} {=count}{/:r}')
        data = {
          'articles': [
            {'title': 'Hello1', 'count': 1, 'forum': {'title': 'Forum1'}},
            {'title': 'Hello2', 'count': 2, 'forum': {'title': 'Forum2'}}]}
        self.assertEquals('Hello1 Forum1 1Hello2 Forum2 2', t(data))


    def test_if_else_scope(self):
        t = compile(
            '{:if none}{=none}{:e}None{/:if} {=count}')
        data = {'none': 'Something',
                'count': 2}
        self.assertEquals('Something 2', t(data))


    def test_select_else_scope(self):
        t = compile(
            '{:s none}{=.}{:e}None{/:s} {=count}')
        data = {'none': 'Something',
                'count': 2}
        self.assertEquals('Something 2', t(data))


    def test_reduce_else_scope(self):
        t = compile(
            '{:r articles}{=title} {:e}No articles{/:r}{=count}')
        data = {'articles': [{'title': '1'}, {'title': '2'}],
                'count': 2}
        self.assertEquals('1 2 2', t(data))


if __name__ == '__main__':
    unittest.main()
