#!/usr/bin/env python
"""
Utility for installing and controlling Porcupine
as an NT service.
"""
import imp
import os
import sys
import time
import win32serviceutil
import win32service

class PorcupineServerService(win32serviceutil.ServiceFramework):
    _svc_name_ = 'Porcupine'
    _svc_display_name_ = 'Porcupine Server'

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        sys.stdout = open('nul', 'w')
        sys.stderr = open('nul', 'w')
        self.controller = None

    def SvcDoRun(self):
        try:
            if '' not in sys.path:
                sys.path.insert(0, '')
            if self.is_frozen():
                os.chdir(os.path.dirname(sys.executable))
            else:
                os.chdir(os.path.abspath(os.path.dirname(__file__)))
            from porcupineserver import Controller
            self.controller = Controller()
            self.controller.start()
            while self.controller.running:
                time.sleep(1.0)
        except Exception:
            if self.controller:
                self.controller.shutdown()
            raise

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        while self.controller is None:
            time.sleep(1.0)
        self.controller.shutdown()

    def is_frozen(self):
        return (hasattr(sys, "frozen")          # new py2exe
                or hasattr(sys, "importers")    # old py2exe
                or imp.is_frozen("__main__"))   # tools/freeze

if __name__ == '__main__':
    try:
        import multiprocessing
        multiprocessing.freeze_support()
    except ImportError:
        pass
    win32serviceutil.HandleCommandLine(PorcupineServerService)
