import { Transport } from "./base.js";

export class KafkaTransport extends Transport {
  constructor(options = {}) {
    super();
    this._brokers = options.brokers ?? ["localhost:9092"];
    this._topic = options.topic ?? "aep.events";
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

  messageKey(event) {
    if (event.task_id) return event.task_id;
    if (event.conversation_id) return event.conversation_id;
    if (event.session_id) return event.session_id;
    if (event.source) return event.source;
    return "";
  }

  targetTopic(event) {
    if (event.type) return `${this._prefix}.type.${event.type}`;
    if (event.source) return `${this._prefix}.source.${event.source}`;
    return this._topic;
  }

  messageHeaders(event) {
    const headers = {};
    if (event.type) headers["aep-type"] = event.type;
    if (event.source) headers["aep-source"] = event.source;
    if (event.session_id) headers["aep-session"] = event.session_id;
    if (event.conversation_id) headers["aep-conversation"] = event.conversation_id;
    if (event.task_id) headers["aep-task"] = event.task_id;
    if (event.correlation_id) headers["aep-correlation"] = event.correlation_id;
    if (event.causation_id) headers["aep-causation"] = event.causation_id;
    if (event.delivery?.mode) headers["aep-delivery-mode"] = event.delivery.mode;
    return headers;
  }

  get brokers() { return this._brokers; }
  get topic() { return this._topic; }
  get prefix() { return this._prefix; }
}
