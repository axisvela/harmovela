#!/usr/bin/env node
import { StdioTransport } from "@axisvela/harmovela-event";
import { HarmovelaHarness } from "@axisvela/harmovela-harness";

const harness = new HarmovelaHarness();
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
