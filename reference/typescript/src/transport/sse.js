import http from "node:http";
import { Transport } from "./base.js";

export class SseServerTransport extends Transport {
  #server = null;
  #clients = new Map();
  #nextClientId = 0;

  constructor(options = {}) {
    super();
    this.port = options.port ?? 0;
    this.host = options.host ?? "127.0.0.1";
    this.path = options.path ?? "/aep/events";
    this.heartbeatInterval = options.heartbeatInterval ?? 15000;
    this.#nextClientId = 0;
  }

  async _onStart() {
    this.#server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === this.path) {
        return this.#handleStream(req, res);
      }

      if (req.method === "POST" && url.pathname === this.path) {
        return this.#handleIngest(req, res);
      }

      res.writeHead(404);
      res.end("not found");
    });

    return new Promise((resolve) => {
      this.#server.listen(this.port, this.host, () => {
        const addr = this.#server.address();
        this.port = addr.port;
        resolve();
      });
    });
  }

  async _onStop() {
    for (const [, { res }] of this.#clients) {
      try { res.end(); } catch {}
      try { res.destroy(); } catch {}
    }
    this.#clients.clear();

    if (this.#server) {
      // Destroy all active connections first, then close
      if (typeof this.#server.closeAllConnections === "function") {
        this.#server.closeAllConnections();
      }
      this.#server.unref?.();

      await new Promise((resolve) => {
        this.#server.close((err) => {
          // Resolve even on error - the server may already be closing
          resolve();
        });
        // Force stop if close doesn't fire within 1s
        setTimeout(resolve, 1000);
      });
      this.#server = null;
    }
  }

  _onSend(data) {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    let event;

    try {
      event = typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      event = data;
    }

    for (const [id, { res }] of this.#clients) {
      res.write(`id: ${event.id}\n`);
      if (event.type) res.write(`event: ${event.type}\n`);
      res.write(`data: ${json}\n\n`);
    }
  }

  #handleStream(req, res) {
    const clientId = ++this.#nextClientId;
    const lastEventId = req.headers["last-event-id"] ?? null;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    this.#clients.set(clientId, { res, lastEventId });

    this.emit("connection", { clientId, lastEventId, remoteAddress: req.socket.remoteAddress });

    const heartbeat = this.heartbeatInterval > 0
      ? setInterval(() => res.write(": heartbeat\n\n"), this.heartbeatInterval)
      : null;

    req.on("close", () => {
      if (heartbeat) clearInterval(heartbeat);
      this.#clients.delete(clientId);
      this.emit("disconnection", { clientId });
    });
  }

  async #handleIngest(req, res) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    const lines = body.split("\n").filter((l) => l.trim().length > 0);

    const accepted = [];
    const errors = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        accepted.push(event);
        this.emit("message", event);
      } catch (err) {
        errors.push({ line: line.substring(0, 100), error: err.message });
      }
    }

    res.writeHead(202, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    res.end(JSON.stringify({ accepted: accepted.length, rejected: errors.length, errors }));

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Last-Event-ID"
      });
      res.end();
    }
  }
}

export class SseClientTransport extends Transport {
  #url = null;
  #baseUrl = null;
  #abortController = null;
  #lastEventId = null;

  constructor(options = {}) {
    super();
    this.baseUrl = options.baseUrl ?? "http://127.0.0.1:0";
    this.path = options.path ?? "/aep/events";
    this.#url = `${this.baseUrl}${this.path}`;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
  }

  async _onStart() {
    this.#connect();
  }

  async _onStop() {
    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }
  }

  async _onSend(data) {
    const body = typeof data === "string" ? data : JSON.stringify(data);

    try {
      await fetch(`${this.#url}${this.#url.includes("?") ? "&" : "?"}session_id=local`, {
        method: "POST",
        headers: { "Content-Type": "application/x-ndjson" },
        body
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        this.emit("error", err);
      }
    }
  }

  async #connect() {
    this.#abortController = new AbortController();

    try {
      const headers = {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache"
      };
      if (this.#lastEventId) {
        headers["Last-Event-ID"] = this.#lastEventId;
      }

      const response = await fetch(this.#url, {
        headers,
        signal: this.#abortController.signal
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.emit("open");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop();

        for (const msg of messages) {
          const event = this.#parseSseMessage(msg);
          if (event) {
            this.#lastEventId = event.id;
            this.emit("message", event);
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        this.emit("error", err);
      }
    }

    this.emit("close");
  }

  #parseSseMessage(text) {
    const lines = text.split("\n");
    let id = null;
    let eventType = null;
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith("id:")) {
        id = line.slice(3).trim();
      } else if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      } else if (line.startsWith(":")) {
        continue;
      }
    }

    if (dataLines.length === 0) return null;

    try {
      const data = JSON.parse(dataLines.join("\n"));
      if (id) data._sseId = id;
      if (eventType) data._sseEvent = eventType;
      return data;
    } catch {
      return { type: eventType ?? "message", id, payload: { raw: dataLines.join("\n") } };
    }
  }
}
