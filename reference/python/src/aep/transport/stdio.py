import sys

from .base import Transport


class StdioTransport(Transport):
    def __init__(self, input=None, output=None, error_output=None):
        super().__init__()
        self.input = input
        self.output = output
        self.error_output = error_output

    def _on_start(self):
        if self.input is None:
            self.input = sys.stdin
        if self.output is None:
            self.output = sys.stdout
        if self.error_output is None:
            self.error_output = sys.stderr

    def _on_stop(self):
        pass

    def _on_send(self, data):
        self.output.write(data)

    def feed(self, line):
        self._receive(line)

    def feed_event(self, event):
        import json
        self._receive(json.dumps(event))
