import { ErrorCode, errorPayload } from "./errors.js";

const States = Object.freeze({
  CREATED: "created",
  OPENED: "opened",
  READY: "ready",
  CLOSED: "closed",
  ERROR: "error"
});

const validTransitions = {
  [States.CREATED]: new Set([States.OPENED, States.ERROR, States.CLOSED]),
  [States.OPENED]: new Set([States.READY, States.ERROR, States.CLOSED]),
  [States.READY]: new Set([States.ERROR, States.CLOSED]),
  [States.CLOSED]: new Set(),
  [States.ERROR]: new Set()
};

function nowISO() {
  return new Date().toISOString();
}

export class AepSession {
  constructor(options = {}) {
    this.id = options.id ?? `sess_${Date.now().toString(36)}`;
    this.source = options.source ?? "aep:session";
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
    if (this.state !== States.CREATED) {
      throw new Error(`cannot open session in state ${this.state}`);
    }
    this.state = States.OPENED;
    this._openedAt = nowISO();
    return {
      spec_version: this.version,
      id: this.nextEventId(),
      type: "session.opened",
      source: this.source,
      session_id: this.id,
      created_at: this._openedAt,
      payload: {
        session_id: this.id,
        version: this.version
      }
    };
  }

  ready(capabilities) {
    if (this.state !== States.OPENED && this.state !== States.CREATED) {
      throw new Error(`cannot mark session ready in state ${this.state}`);
    }
    this.state = States.READY;
    this._readyAt = nowISO();
    this.capabilities = capabilities ?? this.capabilities;
    if (this.heartbeatInterval > 0) {
      this._heartbeatTimer = setInterval(() => {
        if (this.state === States.READY) {
          this._onHeartbeat?.();
        }
      }, this.heartbeatInterval);
    }
    return {
      spec_version: this.version,
      id: this.nextEventId(),
      type: "session.ready",
      source: this.source,
      session_id: this.id,
      created_at: this._readyAt,
      payload: {
        session_id: this.id,
        capabilities: this.capabilities
      }
    };
  }

  heartbeat() {
    if (this.state !== States.READY) return null;
    return {
      spec_version: this.version,
      id: this.nextEventId(),
      type: "session.heartbeat",
      source: this.source,
      session_id: this.id,
      created_at: nowISO(),
      payload: { session_id: this.id }
    };
  }

  close() {
    this._stopHeartbeat();
    if (this.state === States.CLOSED) return null;
    this.state = States.CLOSED;
    return {
      spec_version: this.version,
      id: this.nextEventId(),
      type: "session.closed",
      source: this.source,
      session_id: this.id,
      created_at: nowISO(),
      payload: {
        session_id: this.id,
        reason: "closed_by_peer"
      }
    };
  }

  error(code, message, details = {}) {
    this._stopHeartbeat();
    if (this.state !== States.ERROR) {
      this.state = States.ERROR;
    }
    return {
      spec_version: this.version,
      id: this.nextEventId(),
      type: "session.error",
      source: this.source,
      session_id: this.id,
      created_at: nowISO(),
      payload: {
        session_id: this.id,
        error: errorPayload(code, message, { details })
      }
    };
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  isActive() {
    return this.state === States.READY;
  }

  isOpen() {
    return this.state === States.OPENED || this.state === States.READY;
  }

  isTerminal() {
    return this.state === States.CLOSED || this.state === States.ERROR;
  }
}
