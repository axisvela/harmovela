#!/usr/bin/env node
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";

const [command, ...args] = process.argv.slice(2);

try {
  if (command === "init") await initCommand(args);
  else if (command === "start") await startCommand(args);
  else if (command === "help" || !command) printHelp();
  else {
    console.error(`unknown command: ${command}`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`aep: ${err.message}`);
  process.exitCode = 1;
}

function printHelp() {
  console.log(`Usage: aep <command>\n\nCommands:\n  init\n  start\n`);
}
