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
"""
Porcupine base classes for multi processing, multi threaded network servers
"""
import socket
import time
import Queue
import select
from threading import Thread, currentThread

from porcupine.core import asyncore
from porcupine.core.runtime import multiprocessing
from porcupine.core.servicetypes.service import BaseService

class BaseServerThread(Thread):
    def handle_request(self, request_handler):
        raise NotImplementedError

class Dispatcher(asyncore.dispatcher):
    def __init__(self, request_queue, done_queue=None, socket_map=None):
        # create queue for inactive RequestHandler objects i.e. those served
        self.rh_queue = Queue.Queue(0)
        self.active_connections = 0
        self.request_queue = request_queue
        self.done_queue = done_queue
        self.socket_map = socket_map
        self.accepting = 1

    def readable(self):
        return self.accepting

    def writable(self):
        return False

    def handle_connect(self):
        pass

    def handle_close(self):
        pass

    def handle_accept(self):
        # accept client connection
        client = None
        try:
            client = self.accept()
        except socket.error:
            pass
        if client != None:
            client_socket, addr = client
            try:
                # get inactive requestHandler from queue
                rh = self.rh_queue.get_nowait()
            except Queue.Empty:
                # if empty then create new requestHandler
                rh = RequestHandler(self)
            # set the client socket of requestHandler
            self.active_connections += 1
            client_socket.setblocking(0)
            rh.activate(client_socket, self.socket_map)

class BaseServer(BaseService, Dispatcher):
    "Base class for threaded TCP server using asynchronous sockets"
    type = 'TCPListener'
    
    def __init__(self, name, address, worker_processes, worker_threads,
                 thread_class):
        # initialize base service
        BaseService.__init__(self, name)
        self.addr = address
        self.worker_threads = worker_threads
        self.thread_class = thread_class
        self.is_multiprocess = False
        if multiprocessing:
            if worker_processes == 'auto':
                cpus = multiprocessing.cpu_count()
                if cpus == 1:
                    worker_processes = 0
                else:
                    worker_processes = cpus
            else:
                worker_processes = int(worker_processes)
            self.is_multiprocess = worker_processes > 0
        self.worker_processes = worker_processes
        self.pipes = []             # used for sending management tasks
                                    # to subrpocesses
        self.task_dispatchers = []  # used for getting completed requests
                                    # from subprocesses only when sockets are
                                    # not pickleable
        self.sentinel = None
        self._socket = None

        request_queue = None
        done_queue = None

        if self.is_multiprocess:
            if not hasattr(socket, 'fromfd'):
                # create queues for communicating
                request_queue = get_shared_queue(2048)
                done_queue = get_shared_queue(2048)
                self.sentinel = (-1 , 'EOF')
        else:
            request_queue = Queue.Queue(worker_threads * 2)

        Dispatcher.__init__(self, request_queue, done_queue)

        # create worker tuple
        self.worker_pool = []

    def start(self):
        # start runtime services
        BaseService.start(self)

        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._socket.setblocking(0)
        try:
            self._socket.bind(self.addr)
        except socket.error, v:
            self._socket.close()
            raise v
        self._socket.listen(64)

        if self.request_queue != None:
            # activate server socket
            self.set_socket(self._socket)

        # start workers
        self._start_workers()
        self.running = True

    def _start_workers(self):
        if self.is_multiprocess:
            kwargs = {}
            if self.request_queue == None:
                kwargs['socket'] = self._socket
            else:
                kwargs['request_queue'] = (self.request_queue,
                                           self.request_queue.qsize,
                                           self.request_queue.item_pushed,
                                           self.request_queue.item_popped)
                kwargs['done_queue'] = (self.done_queue,
                                        self.done_queue.qsize,
                                        self.done_queue.item_pushed,
                                        self.done_queue.item_popped)
                kwargs['sentinel'] = self.sentinel

            # start worker processes
            for i in range(self.worker_processes):
                pname = '%s server process %d' % (self.name, i+1)
                pconn, cconn = multiprocessing.Pipe()
                p = SubProcess(pname, self.worker_threads, self.thread_class,
                               cconn, **kwargs)
                p.start()
                self.pipes.append(pconn)
                self.worker_pool.append(p)

            if self.request_queue != None:
                # start task dispatcher thread(s)
                for i in range(8):
                    t = Thread(target=self._task_dispatch,
                               name='%s task dispatcher %d' % (self.name, i+1))
                    t.start()
                    self.task_dispatchers.append(t)
        else:
            for i in range(self.worker_threads):
                tname = '%s server thread %d' % (self.name, i+1)
                t = self.thread_class(target=self._thread_loop, name=tname)
                t.start()
                self.worker_pool.append(t)

    def _stop_workers(self):
        if self.request_queue:
            if self.is_multiprocess:
                qlen = self.worker_processes * self.worker_threads
            else:
                qlen = self.worker_threads
            Dispatcher.close(self)
            for i in range(qlen):
                self.request_queue.put(self.sentinel)

        if self.pipes:
            self.send(self.sentinel)
            self.pipes = []

        # join workers
        for t in self.worker_pool:
            t.join()

        self.worker_pool = []

        if self.done_queue:
            # we have multiprocessing queues
            # join task dispatchers
            for i in range(len(self.task_dispatchers)):
                self.done_queue.put(self.sentinel)
            for t in self.task_dispatchers:
                t.join()

    def send(self, message):
        [conn.send(message) for conn in self.pipes]
        return [conn.recv() for conn in self.pipes]

    def add_runtime_service(self, component, *args, **kwargs):
        inited = BaseService.add_runtime_service(self, component,
                                                 *args, **kwargs)
        if self.is_multiprocess and component == 'db':
            self.send('DB_OPEN')
        return inited

    def remove_runtime_service(self, component):
        if self.is_multiprocess and component == 'db':
            self.send('DB_CLOSE')
        BaseService.remove_runtime_service(self, component)

    def lock_db(self):
        BaseService.lock_db(self)
        if self.is_multiprocess:
            self.send('DB_LOCK')

    def unlock_db(self):
        BaseService.unlock_db(self)
        if self.is_multiprocess:
            self.send('DB_UNLOCK')

    def _task_dispatch(self):
        while True:
            next = self.done_queue.get()
            if next == self.sentinel:
                break
            fd, buffer = next
            try:
                rh = asyncore.socket_map[fd]
                rh.write_buffer(buffer)
                rh.has_response = True
            except KeyError:
                pass

    def _thread_loop(self):
        "loop for threads serving content to clients (non mutltiprocessing)"
        thread = currentThread()
        while True:
            # get next waiting client request
            request_handler = self.request_queue.get()
            if request_handler == self.sentinel:
                break
            else:
                thread.handle_request(request_handler)
                request_handler.has_response = True

    def shutdown(self):
        if self.running:
            self.running = False
            self._stop_workers()
            # shut down runtime services
            BaseService.shutdown(self)

class RequestHandler(asyncore.dispatcher):
    "Request handler object"
    def __init__(self, server):
        self.server = server
        self.has_request = False
        self.has_response = False
        self.output_buffer = ''
        self.input_buffer = []

    def activate(self, sock, socket_map=None):
        self.set_socket(sock, socket_map)

    def write_buffer(self, s):
        self.output_buffer += s

    def readable(self):
        return not self.has_request

    def writable(self):
        return self.has_request

    def handle_connect(self):
        pass

    def handle_close(self):
        pass

    def handle_read(self):
        data = self.recv(8192)
        if data:
            self.input_buffer.append(data)
        else:
            self.input_buffer = ''.join(self.input_buffer)
            self.has_request = True
            if self.input_buffer:
                if self.server.done_queue != None:
                    self.server.request_queue.put((self._fileno,
                                                   self.input_buffer))
                else:
                    # put it in the queue so that is served
                    self.server.request_queue.put(self)
            else:
                # we have a dead socket(?)
                self.close()

    def handle_write(self):
        try:
            if len(self.output_buffer) > 0:
                sent = self.send(self.output_buffer)
                self.output_buffer = self.output_buffer[sent:]
                if len(self.output_buffer) == 0:
                    self.shutdown(socket.SHUT_WR)
                    self.close()
        except socket.error:
            self.close()

    def close(self):
        asyncore.dispatcher.close(self)
        if self.server.socket_map != None:
            self.del_channel(self.server.socket_map)
        self.has_request = False
        self.has_response = False
        self.input_buffer = []
        self.output_buffer = ''
        if self.server != None:
            # put it in inactive request handlers queue
            self.server.rh_queue.put(self)
            self.server.active_connections -= 1
            # print 'Total: ' + str(self.server.active_connections)

if multiprocessing:
    if not hasattr(socket, 'fromfd'):
        # create shared memory queues
        from array import array
        from types import MethodType
        from ctypes import Structure, c_int, c_ubyte, memmove, sizeof, \
                           addressof, string_at
        from multiprocessing.sharedctypes import Array, RawValue
        from multiprocessing import Condition

        class Message(Structure):
            _fields_ = [('fn', c_int),
                        ('count', c_int),
                        ('buffer', c_ubyte * 16384)]

        def get_shared_queue(size):
            queue = Array(Message, size)
            init_queue(queue,
                       RawValue('i', 0),
                       Condition(queue.get_lock()),
                       Condition(queue.get_lock()))
            return queue
            
        def init_queue(queue, qsize, item_pushed, item_popped):
            def get(self):
                self.acquire()
                while qsize.value == 0:
                    self.item_pushed.wait()
                message = self[0]
                fn = message.fn
                buffer = [string_at(addressof(message.buffer), message.count)]
                i = 1
                if fn > 0:
                    while self[i].fn == fn and i < qsize.value:
                        buffer.append(string_at(addressof(self[i].buffer),
                                                self[i].count))
                        i += 1
                # shift
                memmove(addressof(self[0]),
                        addressof(self[i]),
                        (qsize.value - i) * sizeof(self[0]))
                qsize.value -= i
                self.item_popped.notify()
                self.release()
                return fn, ''.join(buffer)

            def put(self, (fn, b)):
                # split buffer into chunks
                chunks = [array('B', b[i:i + 16384])
                          for i in range(0, len(b), 16384)]
                buffer_info = [chunk.buffer_info()
                               for chunk in chunks]
                ln = len(chunks)
                self.acquire()
                while qsize.value + ln > len(self):
                    self.item_popped.wait()
                for i in range(ln):
                    self[qsize.value + i].fn = fn
                    self[qsize.value + i].count = buffer_info[i][1]
                    memmove(addressof(self[qsize.value + i].buffer),
                            *buffer_info[i])
                qsize.value += ln
                self.item_pushed.notify()
                self.release()

            queue.get = MethodType(get, queue, type(queue))
            queue.put = MethodType(put, queue, type(queue))
            queue.qsize = qsize
            queue.item_pushed = item_pushed
            queue.item_popped = item_popped
            return queue

        class RequestHandlerProxy(object):
            def __init__(self, input_buffer):
                self.input_buffer = input_buffer
                self.output_buffer = ''

            def write_buffer(self, s):
                self.output_buffer += s

            def close(self):
                self.input_buffer = ''
                self.output_buffer = ''

    class SubProcess(BaseService, multiprocessing.Process):
        runtime_services = [('config', (), {}),
                            ('db', (), {'init_maintenance':False}),
                            ('session_manager', (), {'init_expiration':False})]

        def __init__(self, name, worker_threads, thread_class, connection,
                     request_queue = None, done_queue = None, sentinel=None,
                     socket = None):
            BaseService.__init__(self, name)
            multiprocessing.Process.__init__(self, name=name)
            self.worker_threads = worker_threads
            self.thread_class = thread_class
            self.connection = connection
            self.request_queue = request_queue
            self.done_queue = done_queue
            self.sentinel = sentinel
            self.socket = socket
            self.is_alive = True

        def start(self):
            multiprocessing.Process.start(self)

        def _async_loop(self, socket_map):
            _use_poll = False
            if hasattr(select, 'poll'):
                _use_poll = True
            try:
                asyncore.loop(16.0, _use_poll, socket_map)
            except select.error, v:
                if v[0] == EINTR:
                    print 'Shutdown not completely clean...'
                else:
                    pass

        def _manage(self):
            while True:
                command = self.connection.recv()
                if command == self.sentinel:
                    break
                elif command == 'DB_LOCK':
                    self.lock_db()
                elif command == 'DB_UNLOCK':
                    self.unlock_db()
                elif command == 'DB_OPEN':
                    self.add_runtime_service('db')
                elif command == 'DB_CLOSE':
                    self.remove_runtime_service('db')
                self.connection.send(True)
            self.connection.send(None)
            self.is_alive = False

        def run(self):
            # start runtime services
            BaseService.start(self)

            # start server
            if self.socket != None:
                socket_map = {}
                
                # start server
                self.request_queue = Queue.Queue(self.worker_threads * 2)
                self.done_queue = None
                server = Dispatcher(self.request_queue, None, socket_map)
                # activate server socket
                server.set_socket(self.socket, socket_map)

                # start asyncore loop
                asyn_thread = Thread(target=self._async_loop,
                                     args=(socket_map, ),
                                     name='%s asyncore thread' % self.name)
                asyn_thread.start()
            else:
                # create queue for inactive RequestHandlerProxy objects
                # i.e. those served
                self.rhproxy_queue = Queue.Queue(0)
                # patch shared queues
                self.request_queue = init_queue(*self.request_queue)
                self.done_queue = init_queue(*self.done_queue)

            thread_pool = []
            for i in range(self.worker_threads):
                tname = '%s thread %d' % (self.name, i+1)
                t = self.thread_class(target=self._thread_loop, name=tname)
                thread_pool.append(t)

            # start management thread
            mt = Thread(target=self._manage,
                        name='%s management thread' % self.name)
            thread_pool.append(mt)

            # start threads
            [t.start() for t in thread_pool]

            try:
                while self.is_alive:
                    time.sleep(8.0)
            except KeyboardInterrupt:
                pass
            except IOError:
                pass

            if self.socket != None:
                for i in range(self.worker_threads):
                    self.request_queue.put(self.sentinel)

            # join threads
            for t in thread_pool:
                t.join()

            if self.socket != None:
                # join asyncore thread
                asyncore.close_all(socket_map)
                asyn_thread.join()

            # shutdown runtime services
            BaseService.shutdown(self)

        def _thread_loop(self):
            "subprocess loop for threads serving content to clients"
            thread = currentThread()
            while True:
                # get next waiting client request
                request_handler = self.request_queue.get()
                if request_handler == self.sentinel:
                    break
                else:
                    if self.done_queue == None:
                        # we have a RequestHandler
                        thread.handle_request(request_handler)
                        request_handler.has_response = True
                    else:
                        # we have a RequestHandlerProxy
                        fd, input_buffer = request_handler
                        try:
                            # get inactive RequestHandlerProxy from queue
                            proxy = self.rhproxy_queue.get_nowait()
                            proxy.input_buffer = input_buffer
                        except Queue.Empty:
                            # if empty then create new RequestHandlerProxy
                            proxy = RequestHandlerProxy(input_buffer)

                        thread.handle_request(proxy)
                        self.done_queue.put((fd, proxy.output_buffer))
                        proxy.close()
                        # add inactive proxy to proxy queue
                        self.rhproxy_queue.put(proxy)
