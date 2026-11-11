import { validateEnvelope } from "@axisvela/harmovela-event";

export const DEFAULT_BASE_URL = "http://127.0.0.1:8790";
export const DEFAULT_PATH = "/aep/api";

export class HarmovelaClientError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "HarmovelaClientError";
    this.status = options.status ?? 0;
    this.body = options.body;
  }
}

export class HarmovelaClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.path = normalizePath(options.path ?? DEFAULT_PATH);
    this.fetch = options.fetch ?? globalThis.fetch;
    this.headers = { ...(options.headers ?? {}) };
    if (typeof this.fetch !== "function") {
      throw new TypeError("HarmovelaClient requires a fetch implementation");
    }
  }

  async health() {
    return this.request("GET", "/healthz");
  }

  async publish(event) {
    const errors = validateEnvelope(event);
    if (errors.length > 0) {
      throw new HarmovelaClientError(
        `invalid Harmovela event: ${errors.join("; ")}`,
        { body: { accepted: false, errors } }
      );
    }
    return this.request("POST", "/events", event);
  }

  async stats() {
    return this.request("GET", "/stats");
  }

  async pending() {
    return this.request("GET", "/pending");
  }

  async deadLettered() {
    return this.request("GET", "/dlq");
  }

  async createSubscription(filter = {}) {
    return this.request("POST", "/subscriptions", { filter });
  }

  async listSubscriptions() {
    const body = await this.request("GET", "/subscriptions");
    return body.subscriptions ?? [];
  }

  async getSubscription(id) {
    return this.request("GET", `/subscriptions/${encodeURIComponent(id)}`);
  }

  async deleteSubscription(id) {
    return this.request("DELETE", `/subscriptions/${encodeURIComponent(id)}`);
  }

  async poll(id) {
    const body = await this.request(
      "GET",
      `/subscriptions/${encodeURIComponent(id)}/events`
    );
    return body.events ?? [];
  }

  async stream(id, onEvent, options = {}) {
    const response = await this.fetch(this.url(`/subscriptions/${encodeURIComponent(id)}/stream`), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...this.headers
      },
      signal: options.signal
    });
    if (!response.ok) {
      const body = await response.text();
      throw new HarmovelaClientError(
        `Harmovela HTTP ${response.status}: ${body.slice(0, 512)}`,
        { status: response.status, body }
      );
    }
    if (!response.body) {
      throw new HarmovelaClientError("Harmovela stream has no body", {
        status: response.status
      });
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        let event;
        try {
          event = JSON.parse(payload);
        } catch (error) {
          throw new HarmovelaClientError(
            `invalid Harmovela stream event: ${error.message}`
          );
        }
        await onEvent(event);
      }
    }
  }

  async request(method, route, body, options = {}) {
    const response = await this.fetch(this.url(route), {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...this.headers,
        ...(options.headers ?? {})
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal
    });
    const text = await response.text();
    let parsed;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new HarmovelaClientError(
          `invalid Harmovela response: HTTP ${response.status}`,
          { status: response.status, body: text }
        );
      }
    }
    if (!response.ok) {
      throw new HarmovelaClientError(
        `Harmovela HTTP ${response.status}: ${text.slice(0, 512)}`,
        { status: response.status, body: parsed ?? text }
      );
    }
    return parsed;
  }

  url(route) {
    return `${this.baseUrl}${this.path}${route.startsWith("/") ? route : `/${route}`}`;
  }
}

function normalizePath(value) {
  const path = value.startsWith("/") ? value : `/${value}`;
  return path.replace(/\/+$/, "");
}
