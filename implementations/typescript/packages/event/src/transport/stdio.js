import readline from "node:readline";
import { stdin, stdout, stderr } from "node:process";
import { Transport } from "./base.js";

export class StdioTransport extends Transport {
  #reader = null;

  constructor(options = {}) {
    super();
    this.input = options.input ?? stdin;
    this.output = options.output ?? stdout;
    this.errorOutput = options.errorOutput ?? stderr;
  }

  async _onStart() {
    this.#reader = readline.createInterface({
      input: this.input,
      crlfDelay: Infinity
    });

    this.#reader.on("line", (line) => {
      this._receive(line);
    });

    this.#reader.on("close", () => {
      this.emit("close");
    });

    if (this.input === stdin && stdin.isTTY) {
      this.errorOutput.write("[aep] stdio transport started\n");
    }
  }

  async _onStop() {
    if (this.#reader) {
      this.#reader.close();
      this.#reader = null;
    }
  }

  _onSend(data) {
    this.output.write(data);
  }
}

export class MockStdioTransport extends Transport {
  constructor() {
    super();
    this.sent = [];
  }

  async _onStart() {}
  async _onStop() {}

  _onSend(data) {
    this.sent.push(data);
  }

  feed(line) {
    this._receive(line);
  }

  feedEvent(event) {
    this._receive(JSON.stringify(event));
  }
}
