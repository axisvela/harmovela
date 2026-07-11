import { EventRouter } from "../router.js";
import http from "node:http";
import { validateEnvelope } from "../validate.js";
import { WsServerTransport } from "../transport/websocket.js";
import { SseServerTransport } from "../transport/sse.js";
import { createDeliveryStore } from "./config.js";

export class AepRuntimeService {
  constructor(config, options = {}) {
    this.config = config;
    this.router = options.router ?? new EventRouter();
    this.store = options.store ?? createDeliveryStore(config);
    this.transports = {};
    this.started = false;
  }

  subscribe(pattern, handler) {
    this.router.on(pattern, handler);
    return this;
  }

  publish(event) {
    const errors = validateEnvelope(event);
    if (errors.length > 0) {
      throw new Error(`invalid AEP event: ${errors.join("; ")}`);
    }
    this.store.track?.(event.id, event.subscription_id ?? "_runtime");
    this.router.dispatch(event);
    for (const transport of Object.values(this.transports)) {
      transport.send?.(event);
    }
    return event;
  }

  async start() {
    if (this.started) return;
    const ws = this.config.transports?.websocket;
    if (ws?.enabled) {
      const transport = new WsServerTransport({ host: ws.host, port: ws.port, path: ws.path ?? "/aep" });
      transport.on("message", (event) => this.publish(stripPrivateFields(event)));
      await transport.start();
      this.transports.websocket = transport;
    }
    const sse = this.config.transports?.sse;
    if (sse?.enabled) {
      const transport = new SseServerTransport({ host: sse.host, port: sse.port, path: sse.path ?? "/aep/events" });
      transport.on("message", (event) => this.publish(event));
      await transport.start();
      this.transports.sse = transport;
    }
    const status = this.config.transports?.status;
    if (status?.enabled) {
      this.transports.status = await startStatusServer(this, status);
    }
    this.started = true;
  }

  async stop() {
    const transports = Object.values(this.transports).reverse();
    for (const transport of transports) await transport.stop();
    this.transports = {};
    this.store.close?.();
    this.started = false;
  }

  getStats() {
    return this.store.getStats?.() ?? {};
  }

  getPending() {
    return this.store.getPending?.() ?? [];
  }
}

function stripPrivateFields(event) {
  const { _ws, ...publicEvent } = event;
  return publicEvent;
}

function startStatusServer(service, options) {
  const path = options.path ?? "/healthz";
  const server = http.createServer((req, res) => {
    if (req.method !== "GET" || new URL(req.url, `http://${req.headers.host}`).pathname !== path) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const body = JSON.stringify({
      status: "ok",
      runtime: service.config.runtime,
      delivery: service.getStats()
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(options.port ?? 0, options.host ?? "127.0.0.1", () => {
      const addr = server.address();
      resolve({
        port: addr.port,
        stop: () => new Promise((done) => server.close(done))
      });
    });
  });
}
