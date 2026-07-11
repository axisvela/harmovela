import { Transport } from "./base.js";

export class RedisTransport extends Transport {
  constructor(options = {}) {
    super();
    this._addr = options.addr ?? "localhost:6379";
    this._stream = options.stream ?? "aep.events";
    this._prefix = options.prefix ?? "aep";
  }

  async _onStart() {
    this._started = true;
  }

  async _onStop() {
    this._started = false;
  }

  _onSend(event) {
    if (!this._started) throw new Error("not started");
    const data = JSON.stringify(event);
    JSON.parse(data);
  }

  streamKey(event) {
    if (event.type) return `${this._prefix}.type.${event.type}`;
    if (event.source) return `${this._prefix}.source.${event.source}`;
    return this._stream;
  }

  consumerGroup(event) {
    if (event.session_id) return `${this._prefix}-${event.session_id}`;
    return `${this._prefix}-default`;
  }

  entryFields(event) {
    const fields = { body: JSON.stringify(event) };
    if (event.type) fields["aep-type"] = event.type;
    if (event.source) fields["aep-source"] = event.source;
    if (event.session_id) fields["aep-session"] = event.session_id;
    if (event.conversation_id) fields["aep-conversation"] = event.conversation_id;
    if (event.task_id) fields["aep-task"] = event.task_id;
    if (event.correlation_id) fields["aep-correlation"] = event.correlation_id;
    if (event.causation_id) fields["aep-causation"] = event.causation_id;
    if (event.delivery?.mode) fields["aep-delivery-mode"] = event.delivery.mode;
    return fields;
  }

  get addr() { return this._addr; }
  get stream() { return this._stream; }
  get prefix() { return this._prefix; }
}
