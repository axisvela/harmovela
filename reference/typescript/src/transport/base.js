import { EventEmitter } from "node:events";

export class Transport extends EventEmitter {
  #started = false;

  async start() {
    if (this.#started) return;
    this.#started = true;
    await this._onStart();
  }

  async stop() {
    if (!this.#started) return;
    this.#started = false;
    await this._onStop();
  }

  send(event) {
    this._onSend(event);
  }

  get isStarted() { return this.#started; }

  // Subclass overrides
  async _onStart() {}
  async _onStop() {}
  _onSend(_event) {
    throw new Error("_onSend not implemented");
  }

  // Protocol helpers
  _receive(line) {
    if (!line || line.trim().length === 0) return;
    try {
      const event = JSON.parse(line);
      this.emit("message", event);
    } catch (err) {
      this.emit("error", err);
    }
  }

  _sendJson(obj) {
    this._onSend(JSON.stringify(obj));
  }

  _sendLine(json) {
    this._onSend(json + "\n");
  }
}
