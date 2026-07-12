import { EventRouter } from "../router.js";
import { randomUUID } from "node:crypto";
import { validateEnvelope } from "../validate.js";
import { subscriptionMatches } from "../subscription.js";
import { WsServerTransport } from "../transport/websocket.js";
import { SseServerTransport } from "../transport/sse.js";
import { createDeliveryStore } from "./config.js";
import { startApiServer } from "./api-server.js";

export class AepRuntimeService {
  constructor(config, options = {}) {
    this.config = config;
    this.router = options.router ?? new EventRouter();
    this.store = options.store ?? createDeliveryStore(config);
    this.transports = {};
    this.subscriptions = new Map();
    this.maxBuffer = 1000;
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
    for (const entry of this.subscriptions.values()) {
      if (subscriptionMatches({ payload: entry.record.filter }, event)) {
        entry.buffer.push(event);
        if (entry.buffer.length > this.maxBuffer) entry.buffer.shift();
        for (const sink of entry.sinks) sink(event);
      }
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
    const api = this.config.transports?.api;
    if (api?.enabled) {
      this.transports.api = await startApiServer(this, api);
    }
    const persisted = await this.store.listSubscriptions?.() ?? [];
    for (const record of persisted) {
      this.subscriptions.set(record.id, { record, buffer: [], sinks: new Set() });
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

  getDeadLettered() {
    return this.store.getDeadLettered?.() ?? [];
  }

  async createSubscription(filter) {
    const record = { id: `sub_${randomUUID()}`, filter: filter ?? {}, created_at: new Date().toISOString() };
    await this.store.createSubscription?.(record);
    this.subscriptions.set(record.id, { record, buffer: [], sinks: new Set() });
    return record;
  }

  listSubscriptions() {
    return [...this.subscriptions.values()].map((e) => e.record);
  }

  getSubscription(id) {
    return this.subscriptions.get(id)?.record ?? null;
  }

  async deleteSubscription(id) {
    const existed = this.subscriptions.delete(id);
    await this.store.deleteSubscription?.(id);
    return existed;
  }

  takeEvents(id, max) {
    const entry = this.subscriptions.get(id);
    if (!entry) return [];
    return entry.buffer.splice(0, max);
  }

  attachStream(id, sink) {
    const entry = this.subscriptions.get(id);
    if (!entry) return null;
    entry.sinks.add(sink);
    return () => entry.sinks.delete(sink);
  }
}

function stripPrivateFields(event) {
  const { _ws, ...publicEvent } = event;
  return publicEvent;
}
