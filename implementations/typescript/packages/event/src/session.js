const States = Object.freeze({
  CREATED: "created",
  OPENED: "opened",
  READY: "ready",
  CLOSED: "closed",
  ERROR: "error"
});

function nowISO() {
  return new Date().toISOString();
}

export class HarmovelaSession {
  constructor(options = {}) {
    this.id = options.id ?? `sess_${Date.now().toString(36)}`;
    this.source = options.source ?? "harmovela:session";
    this.version = options.version ?? "0.2";
    this.capabilities = options.capabilities ?? null;
    this.state = States.CREATED;
    this.heartbeatInterval = options.heartbeatIntervalMs ?? 0;
    this._heartbeatTimer = null;
    this._eventId = 0;
    this._openedAt = null;
    this._readyAt = null;
  }

  nextEventId() {
    return `evt_sess_${String(++this._eventId).padStart(6, "0")}`;
  }

  opened() {
    if (this.state !== States.CREATED) throw new Error(`cannot open session in state ${this.state}`);
    this.state = States.OPENED;
    this._openedAt = nowISO();
    return this._event("session.opened", this._openedAt, { session_id: this.id, version: this.version });
  }

  ready(capabilities) {
    if (this.state !== States.OPENED && this.state !== States.CREATED) throw new Error(`cannot mark session ready in state ${this.state}`);
    this.state = States.READY;
    this._readyAt = nowISO();
    this.capabilities = capabilities ?? this.capabilities;
    if (this.heartbeatInterval > 0) {
      this._heartbeatTimer = setInterval(() => {
        if (this.state === States.READY) this._onHeartbeat?.();
      }, this.heartbeatInterval);
    }
    return this._event("session.ready", this._readyAt, { session_id: this.id, capabilities: this.capabilities });
  }

  heartbeat() {
    return this.state === States.READY ? this._event("session.heartbeat", nowISO(), { session_id: this.id }) : null;
  }

  close() {
    this._stopHeartbeat();
    if (this.state === States.CLOSED) return null;
    this.state = States.CLOSED;
    return this._event("session.closed", nowISO(), { session_id: this.id, reason: "closed_by_peer" });
  }

  error(code, message, details = {}) {
    this._stopHeartbeat();
    this.state = States.ERROR;
    return this._event("session.error", nowISO(), {
      session_id: this.id,
      error: { code, message, retryable: false, details }
    });
  }

  _event(type, created_at, payload) {
    return { spec_version: this.version, id: this.nextEventId(), type, source: this.source, session_id: this.id, created_at, payload };
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  isActive() { return this.state === States.READY; }
  isOpen() { return this.state === States.OPENED || this.state === States.READY; }
  isTerminal() { return this.state === States.CLOSED || this.state === States.ERROR; }
}
