import asyncio
import json
import threading

import websockets

from .base import Transport


class WsServerTransport(Transport):
    def __init__(self, port=0, host="127.0.0.1", path="/aep"):
        super().__init__()
        self.port = port
        self.host = host
        self.path = path
        self._clients = set()
        self._loop = None
        self._thread = None
        self._server = None

    def _on_start(self):
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        future = asyncio.run_coroutine_threadsafe(self._start_server(), self._loop)
        future.result(timeout=5)

    async def _start_server(self):
        self._server = await websockets.serve(
            self._handle_client,
            self.host,
            self.port,
            subprotocols=["aep-0.1"],
        )
        sockets = self._server.sockets
        if sockets:
            self.port = sockets[0].getsockname()[1]

    async def _handle_client(self, ws):
        self._clients.add(ws)
        try:
            async for message in ws:
                try:
                    event = json.loads(message)
                    self.on_event(event)
                except json.JSONDecodeError as err:
                    self.on_error(err)
        finally:
            self._clients.discard(ws)

    def _on_stop(self):
        if self._loop is None:
            return
        if self._server:
            future = asyncio.run_coroutine_threadsafe(self._stop_server(), self._loop)
            try:
                future.result(timeout=5)
            except Exception:
                pass
        self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    async def _stop_server(self):
        if self._server:
            self._server.close()
            await self._server.wait_closed()

    def _on_send(self, data):
        json_str = data if isinstance(data, str) else json.dumps(data)
        if self._loop and self._clients:
            asyncio.run_coroutine_threadsafe(self._broadcast(json_str), self._loop)

    async def _broadcast(self, json_str):
        disconnected = set()
        for ws in list(self._clients):
            try:
                await ws.send(json_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(ws)
        self._clients -= disconnected

    def _run_loop(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()


class WsClientTransport(Transport):
    def __init__(self, url="ws://127.0.0.1:0/aep", reconnect=False, reconnect_delay=1000):
        super().__init__()
        self.url = url
        self.reconnect = reconnect
        self.reconnect_delay = reconnect_delay
        self._ws = None
        self._loop = None
        self._thread = None

    def _on_start(self):
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        future = asyncio.run_coroutine_threadsafe(self._connect(), self._loop)
        future.result(timeout=5)

    async def _connect(self):
        self._ws = await websockets.connect(
            self.url,
            subprotocols=["aep-0.1"],
        )
        asyncio.ensure_future(self._listen())

    def _on_stop(self):
        if self._loop is None:
            return
        if self._ws:
            future = asyncio.run_coroutine_threadsafe(self._close_ws(), self._loop)
            try:
                future.result(timeout=5)
            except Exception:
                pass
            self._ws = None
        self._loop.call_soon_threadsafe(self._loop.stop)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    async def _close_ws(self):
        await self._ws.close()

    def _on_send(self, data):
        json_str = data if isinstance(data, str) else json.dumps(data)
        if self._loop and self._ws:
            asyncio.run_coroutine_threadsafe(self._send_ws(json_str), self._loop)

    async def _send_ws(self, json_str):
        await self._ws.send(json_str)

    async def _listen(self):
        try:
            async for message in self._ws:
                try:
                    event = json.loads(message)
                    self.on_event(event)
                except json.JSONDecodeError as err:
                    self.on_error(err)
        except websockets.exceptions.ConnectionClosed:
            pass

    def _run_loop(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()
