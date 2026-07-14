#!/usr/bin/env node
import { StdioTransport } from "@axisrobo/harmovela-event";
import { HarmovelaHarness } from "@axisrobo/harmovela-harness";

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
