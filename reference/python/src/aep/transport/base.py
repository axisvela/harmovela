import json


class Transport:
    def __init__(self):
        self._started = False
        self.events: list[dict] = []
        self.errors: list[Exception] = []

    def start(self):
        if self._started:
            return
        self._started = True
        self._on_start()

    def stop(self):
        if not self._started:
            return
        self._started = False
        self._on_stop()

    def send(self, event):
        self._on_send(event)

    @property
    def is_started(self):
        return self._started

    def _on_start(self):
        pass

    def _on_stop(self):
        pass

    def _on_send(self, _data):
        raise NotImplementedError("_on_send not implemented")

    def _receive(self, line):
        if not line or line.strip() == "":
            return
        try:
            event = json.loads(line)
            self.on_event(event)
        except json.JSONDecodeError as err:
            self.on_error(err)

    def _send_json(self, obj):
        self._on_send(json.dumps(obj))

    def _send_line(self, json_str):
        self._on_send(json_str + "\n")

    def on_event(self, event):
        self.events.append(event)

    def on_error(self, err):
        self.errors.append(err)
