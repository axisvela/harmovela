#!/usr/bin/env node
import { StdioTransport } from "./transport/stdio.js";
import { AepHarness } from "./harness.js";

const harness = new AepHarness();
const transport = new StdioTransport();

transport.on("message", (event) => {
  for (const response of harness.handle(event)) {
    transport.send(JSON.stringify(response) + "\n");
  }
});

transport.on("close", () => {
  process.exit(0);
});

transport.start();
