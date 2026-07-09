#!/usr/bin/env node
import readline from "node:readline";
import { stdin, stdout, stderr } from "node:process";
import { AepHarness } from "./harness.js";

const harness = new AepHarness();
const reader = readline.createInterface({ input: stdin, crlfDelay: Infinity });

reader.on("line", (line) => {
  if (line.trim().length === 0) return;

  try {
    const event = JSON.parse(line);
    for (const response of harness.handle(event)) {
      stdout.write(`${JSON.stringify(response)}\n`);
    }
  } catch (error) {
    const response = harness.handle({
      aep_version: "0.1",
      id: "invalid-json",
      type: "event.rejected",
      source: "stdio",
      created_at: new Date().toISOString(),
      payload: {
        errors: [`invalid JSON: ${error.message}`]
      }
    })[0];
    stderr.write(`${JSON.stringify(response)}\n`);
  }
});
