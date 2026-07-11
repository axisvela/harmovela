#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";
import { emitCommand } from "./commands/emit.js";
import { subscribeCommand } from "./commands/subscribe.js";
import { conformanceCommand } from "./commands/conformance.js";
import { dlqCommand } from "./commands/dlq.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("aep")
  .description("Agent Event Protocol CLI")
  .showHelpAfterError();

program.command("init")
  .description("Create an AEP runtime config file")
  .option("--config <path>", "config file path", "aep.config.json")
  .action((options) => run(() => initCommand(options)));

program.command("start")
  .description("Start the local aepd runtime daemon")
  .option("--config <path>", "config file path", process.env.AEP_CONFIG ?? "aep.config.json")
  .action((options) => run(() => startCommand(options)));

program.command("status")
  .description("Query an aepd health endpoint")
  .option("--url <url>", "health endpoint URL", "http://127.0.0.1:8790/aep/api/healthz")
  .action((options) => run(() => statusCommand(options)));

program.command("emit")
  .description("Emit one AEP event through WebSocket")
  .argument("<type>", "event type")
  .option("--payload <json>", "event payload JSON", "{}")
  .option("--url <url>", "WebSocket URL", "ws://127.0.0.1:8787/aep")
  .option("--id <id>", "event id")
  .option("--source <source>", "event source", "cli:aep")
  .action((type, options) => run(() => emitCommand(type, options)));

program.command("subscribe")
  .description("Subscribe to AEP events through WebSocket")
  .option("--type <pattern>", "event type pattern", "*")
  .option("--url <url>", "WebSocket URL", "ws://127.0.0.1:8787/aep")
  .action((options) => run(() => subscribeCommand(options)));

program.command("dlq")
  .description("Inspect dead-lettered events")
  .argument("[subcommand]", "dlq subcommand", "list")
  .option("--config <path>", "config file path", process.env.AEP_CONFIG ?? "aep.config.json")
  .action((subcommand, options) => run(() => dlqCommand(subcommand, options)));

program.command("conformance")
  .description("Run AEP conformance fixtures")
  .option("--level <level>", "target conformance level")
  .action((options) => run(() => conformanceCommand(options)));

program.parseAsync(process.argv);

async function run(fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`aep: ${err.message}`);
    process.exitCode = 1;
  }
}
