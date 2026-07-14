import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import { Transport } from "./base.js";

export class WsServerTransport extends Transport {
  #server = null;
  #wss = null;
  #clients = new Set();

  constructor(options = {}) {
    super();
    this.port = options.port ?? 0;
    this.host = options.host ?? "127.0.0.1";
    this.path = options.path ?? "/harmovela";
    this.httpServer = options.httpServer ?? null;
  }

  async _onStart() {
    const srv = this.httpServer ?? http.createServer();
    this.#server = srv;

    return new Promise((resolve) => {
      this.#wss = new WebSocketServer({
        server: srv,
        path: this.path,
        handleProtocols: (protocols) => {
          const requested = new Set(protocols);
          if (requested.has("harmovela-0.2")) return "harmovela-0.2";
          return false;
        }
      });

      this.#wss.on("connection", (ws, req) => {
        this.#clients.add(ws);
        this.emit("connection", { remoteAddress: req?.socket?.remoteAddress });

        ws.on("message", (data) => {
          try {
            const event = JSON.parse(data.toString());
            event._ws = ws;
            this.emit("message", event);
          } catch (err) {
            this.emit("error", err);
          }
        });

        ws.on("close", (code) => {
          this.#clients.delete(ws);
          this.emit("disconnection", { code });
          if (this.#clients.size === 0) {
            this.emit("drain");
          }
        });

        ws.on("error", (err) => {
          this.emit("error", err);
        });

        ws.on("pong", () => {
          this.emit("pong");
        });
      });

      if (!this.httpServer) {
        srv.listen(this.port, this.host, () => {
          const addr = srv.address();
          this.port = addr.port;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async _onStop() {
    for (const client of this.#clients) {
      client.close(1000, "server shutdown");
    }
    this.#clients.clear();

    if (this.#wss) {
      await new Promise((resolve) => this.#wss.close(resolve));
      this.#wss = null;
    }

    if (this.#server) {
      this.#server.closeAllConnections?.();
      await new Promise((resolve) => this.#server.close(resolve));
      this.#server = null;
    }
  }

  _onSend(data) {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    for (const client of this.#clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    }
  }

  broadcast(event, except) {
    const json = typeof event === "string" ? event : JSON.stringify(event);
    for (const client of this.#clients) {
      if (client !== except && client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    }
  }

  ping() {
    for (const client of this.#clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    }
  }
}

export class WsClientTransport extends Transport {
  #ws = null;
  #url = null;
  #reconnect = false;

  constructor(options = {}) {
    super();
    this.url = options.url ?? "ws://127.0.0.1:0/aep";
    this.reconnect = options.reconnect ?? false;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
  }

  async _onStart() {
    return this.#connect();
  }

  async _onStop() {
    if (this.#ws) {
      this.#reconnect = false;
      this.#ws.close(1000, "client shutdown");
      this.#ws = null;
    }
  }

  _onSend(data) {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      this.#ws.send(json);
    }
  }

  #connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url, ["harmovela-0.2"]);
      this.#ws = ws;

      ws.on("open", () => {
        this.emit("open");
        resolve();
      });

      ws.on("message", (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.emit("message", event);
        } catch (err) {
          this.emit("error", err);
        }
      });

      ws.on("close", (code) => {
        this.emit("close", code);
        if (this.#reconnect && this.isStarted) {
          setTimeout(() => this.#connect(), this.reconnectDelay);
        }
      });

      ws.on("error", (err) => {
        this.emit("error", err);
        reject(err);
      });
    });
  }
}
