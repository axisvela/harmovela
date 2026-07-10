import { Transport } from "./base.js";

export class NatsTransport extends Transport {
  constructor(options = {}) {
    super();
    this._url = options.url ?? "nats://localhost:4222";
    this._prefix = options.prefix ?? "aep";
    this._nc = null;
    this._sub = null;
    this._opts = options.natsOptions ?? {};
  }

  async _onStart() {
    const { connect } = await import("nats");
    this._nc = await connect({ servers: this._url, ...this._opts });

    const sub = this._nc.subscribe(this._prefix + ".>");
    this._sub = sub;

    (async () => {
      for await (const msg of sub) {
        try {
          const event = JSON.parse(new TextDecoder().decode(msg.data));
          this.emit("message", event);
        } catch (err) {
          this.emit("error", err);
        }
      }
    })();
  }

  async _onStop() {
    if (this._sub) {
      this._sub.unsubscribe();
      this._sub = null;
    }
    if (this._nc) {
      await this._nc.drain();
      await this._nc.close();
      this._nc = null;
    }
  }

  _onSend(event) {
    if (!this._nc) throw new Error("not connected");
    const subject = this._eventSubject(event);
    const data = new TextEncoder().encode(JSON.stringify(event));
    this._nc.publish(subject, data);
  }

  _eventSubject(event) {
    if (event.topic) return `${this._prefix}.topic.${event.topic}`;
    if (event.type) return `${this._prefix}.type.${event.type}`;
    if (event.source) return `${this._prefix}.source.${event.source}`;
    return `${this._prefix}.event`;
  }

  subscriptionSubjects(patterns, sessionId) {
    const subjects = [];
    for (const p of patterns) {
      if (p === "*") {
        subjects.push(`${this._prefix}.>`);
      } else {
        subjects.push(`${this._prefix}.type.${p.replace(/\*/g, ">")}`);
      }
    }
    if (sessionId) {
      subjects.push(`${this._prefix}.sess.${sessionId}`);
    }
    return subjects;
  }

  async request(subject, event, timeout = 5000) {
    if (!this._nc) throw new Error("not connected");
    const data = new TextEncoder().encode(JSON.stringify(event));
    const msg = await this._nc.request(subject, data, { timeout });
    return JSON.parse(new TextDecoder().decode(msg.data));
  }

  get connected() { return this._nc !== null && !this._nc.isClosed(); }
  get nc() { return this._nc; }
}
