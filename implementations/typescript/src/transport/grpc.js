import path from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { Transport } from "./base.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.join(__dirname, "aep.proto");

let _cachedPackageDefinition = null;

function _loadProto() {
  if (_cachedPackageDefinition) return _cachedPackageDefinition;
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  _cachedPackageDefinition = grpc.loadPackageDefinition(packageDefinition);
  return _cachedPackageDefinition;
}

export class GrpcServerTransport extends Transport {
  #server = null;
  #calls = new Map();
  #nextCallId = 0;

  constructor(options = {}) {
    super();
    this.host = options.host ?? "127.0.0.1";
    this.port = options.port ?? 0;
    this.address = options.address ?? `${this.host}:${this.port}`;
    this.credentials = options.credentials ?? grpc.ServerCredentials.createInsecure();
    this.maxMessageSize = options.maxMessageSize ?? 4 * 1024 * 1024;
  }

  async _onStart() {
    const proto = _loadProto();
    const service = proto.aep.v1.AepTransport.service;

    this.#server = new grpc.Server({
      "grpc.max_receive_message_length": this.maxMessageSize,
      "grpc.max_send_message_length": this.maxMessageSize
    });

    this.#server.addService(service, {
      Stream: (call) => {
        const callId = ++this.#nextCallId;
        this.#calls.set(callId, call);

        this.emit("connection", {
          callId,
          remoteAddress: call.getPeer?.() ?? "unknown",
          metadata: call.metadata?.getMap?.() ?? {}
        });

        call.on("data", (msg) => {
          try {
            const event = JSON.parse(msg.json_payload);
            event._callId = callId;
            event._call = call;
            this.emit("message", event);
          } catch (err) {
            this.emit("error", err);
          }
        });

        call.on("end", () => {
          this.#calls.delete(callId);
          this.emit("disconnection", { callId });
          call.end();
        });

        call.on("error", (err) => {
          this.emit("error", err);
        });

        call.on("cancelled", () => {
          this.#calls.delete(callId);
          this.emit("disconnection", { callId, reason: "cancelled" });
        });
      }
    });

    return new Promise((resolve, reject) => {
      this.#server.bindAsync(this.address, this.credentials, (err, port) => {
        if (err) return reject(err);
        this.port = port;
        resolve();
      });
    });
  }

  async _onStop() {
    for (const [, call] of this.#calls) {
      try { call.end(); } catch {}
    }
    this.#calls.clear();

    if (this.#server) {
      return new Promise((resolve) => {
        this.#server.tryShutdown(() => {
          this.#server = null;
          resolve();
        });
        setTimeout(() => {
          if (this.#server) {
            this.#server.forceShutdown();
            this.#server = null;
          }
          resolve();
        }, 5000);
      });
    }
  }

  _onSend(data) {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    const msg = { json_payload: json };
    for (const [, call] of this.#calls) {
      try {
        call.write(msg);
      } catch (err) {
        this.emit("error", err);
      }
    }
  }

  sendToCall(callId, data) {
    const call = this.#calls.get(callId);
    if (!call) return;
    const json = typeof data === "string" ? data : JSON.stringify(data);
    try {
      call.write({ json_payload: json });
    } catch (err) {
      this.emit("error", err);
      this.#calls.delete(callId);
    }
  }

  ping() {
    for (const [, call] of this.#calls) {
      try {
        call.write({ json_payload: JSON.stringify({ type: "session.heartbeat", aep_version: "0.1", id: "ping" }) });
      } catch {}
    }
  }
}

export class GrpcClientTransport extends Transport {
  #client = null;
  #call = null;
  #metadata = null;

  constructor(options = {}) {
    super();
    this.address = options.address ?? "127.0.0.1:0";
    this.credentials = options.credentials ?? grpc.credentials.createInsecure();
    this.maxMessageSize = options.maxMessageSize ?? 4 * 1024 * 1024;
    this.metadata = options.metadata ?? {};
    this.reconnect = options.reconnect ?? false;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
  }

  async _onStart() {
    return this.#connect();
  }

  async _onStop() {
    if (this.#call) {
      this.#call.cancel();
      this.#call.end();
      this.#call = null;
    }
    if (this.#client) {
      this.#client.close();
      this.#client = null;
    }
  }

  _onSend(data) {
    if (!this.#call) return;
    const json = typeof data === "string" ? data : JSON.stringify(data);
    try {
      this.#call.write({ json_payload: json });
    } catch (err) {
      this.emit("error", err);
    }
  }

  #connect() {
    const proto = _loadProto();

    this.#metadata = new grpc.Metadata();
    for (const [key, value] of Object.entries(this.metadata)) {
      this.#metadata.set(key, String(value));
    }

    this.#client = new proto.aep.v1.AepTransport(
      this.address,
      this.credentials,
      {
        "grpc.max_receive_message_length": this.maxMessageSize,
        "grpc.max_send_message_length": this.maxMessageSize
      }
    );

    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 10);

      this.#client.waitForReady(deadline, (err) => {
        if (err) {
          this.emit("error", err);
          reject(err);
          return;
        }

        this.#call = this.#client.Stream(this.#metadata);

        this.#call.on("data", (msg) => {
          try {
            const event = JSON.parse(msg.json_payload);
            this.emit("message", event);
          } catch (err) {
            this.emit("error", err);
          }
        });

        this.#call.on("end", () => {
          this.emit("close");
          if (this.reconnect && this.isStarted) {
            setTimeout(() => this.#connect().catch(() => {}), this.reconnectDelay);
          }
        });

        this.#call.on("error", (err) => {
          this.emit("error", err);
        });

        this.#call.on("status", (status) => {
          this.emit("status", status);
        });

        this.emit("open");
        resolve();
      });
    });
  }
}
