import unittest
import imp
import sys
import os
import marshal

from porcupine import exceptions
import porcupine.core.http.ServerPage as server_page


class MockOs:

    def stat(self, file):
        return [0] * 10

    open1_counter = 0

    @staticmethod
    def open1(a, b):
        MockOs.open1_counter += 1
        if MockOs.open1_counter == 1:
            raise IOError
        if MockOs.open1_counter == 2:
            tmp = os.tmpfile()
            tmp.write(('{0}<%if True:{1} Server.append(0){1}'
                       'else:{1} pass{1}end%>'.format(
                        server_page.NT_UTF_8_IDENTIFIER, chr(10))))
            tmp.seek(0)
            return tmp
        if MockOs.open1_counter == 3:
            return os.tmpfile()

    open2_counter = 0

    @staticmethod
    def open2(a, b):
        MockOs.open2_counter += 1
        if MockOs.open2_counter == 1:
            raise IOError
        if MockOs.open2_counter == 2:
            tmp = os.tmpfile()
            tmp.write('<h1>')
            tmp.seek(0)
            return tmp
        if MockOs.open2_counter == 3:
            return os.tmpfile()

    def glob(self, a):
        return [1]

    def remove(self, file):
        pass


class MockContext:
    """ Provides mutable objects for changing. """

    class Response:

        def __init__(self):
            self.result = list()

        def write(self, a):
            self.result.append(a)

        def value(self):
            return ''.join(self.result)

    server = list()
    session = list()
    response = Response()
    request = list()


class ServerPageTest(unittest.TestCase):

    def test_incorrect_path(self):
        context = ''
        filename = ''
        self.assertRaises(exceptions.NotFound, server_page.execute,
                          context, filename)

    def test_execute(self):
        old_os = server_page.os
        server_page.os = MockOs()
        tmp = os.tmpfile()
        server_page.open = lambda a, b: tmp
        try:
            context = MockContext()
            filename = '.'
            marshal.dump('Server.append(0)', tmp)
            tmp.seek(0)
            expected_size = len(context.server) + 1
            server_page.execute(context, filename)
            self.assertEqual(len(context.server), expected_size)
        finally:
            server_page.os = old_os
            del server_page.open

    def test_psp_tags(self):
        old_os = server_page.os
        server_page.os = MockOs()
        tmp = os.tmpfile()
        server_page.open = MockOs.open1
        old_glob = server_page.glob
        server_page.glob = MockOs()
        try:
            context = MockContext()
            filename = 'tmp.tmp'
            expected_size = len(context.server) + 1
            server_page.execute(context, filename)
            self.assertEqual(len(context.server), expected_size)
        finally:
            server_page.os = old_os
            server_page.glob = old_glob
            del server_page.open

    def test_pure_html(self):
        old_os = server_page.os
        server_page.os = MockOs()
        tmp = os.tmpfile()
        server_page.open = MockOs.open2
        try:
            context = MockContext()
            filename = 'tmp.tmp'
            server_page.execute(context, filename)
            self.assertEqual(context.response.value(), '<h1>')
        finally:
            server_page.os = old_os
            del server_page.open
