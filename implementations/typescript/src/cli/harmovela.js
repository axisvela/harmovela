#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";
import { emitCommand } from "./commands/emit.js";
import { subscribeCommand } from "./commands/subscribe.js";
import { conformanceCommand } from "./commands/conformance.js";
import { dlqCommand } from "./commands/dlq.js";
import { statusCommand } from "./commands/status.js";
import { subscriptionsCommand } from "./commands/subscriptions.js";

const program = new Command();

program
  .name("harmovela")
  .description("Harmovela Protocol CLI")
  .showHelpAfterError();

program.command("init")
  .description("Create a Harmovela runtime config file")
  .option("--config <path>", "config file path", "harmovela.config.json")
  .action((options) => run(() => initCommand(options)));

program.command("start")
  .description("Start the local harmovelad runtime daemon")
  .option("--config <path>", "config file path", process.env.HARMOVELA_CONFIG ?? "harmovela.config.json")
  .action((options) => run(() => startCommand(options)));

program.command("status")
  .description("Query a harmovelad health endpoint")
  .option("--url <url>", "health endpoint URL", "http://127.0.0.1:8790/harmovela/api/healthz")
  .action((options) => run(() => statusCommand(options)));

program.command("emit")
  .description("Emit one Harmovela event through WebSocket")
  .argument("<type>", "event type")
  .option("--payload <json>", "event payload JSON", "{}")
  .option("--url <url>", "WebSocket URL", "ws://127.0.0.1:8787/harmovela")
  .option("--id <id>", "event id")
  .option("--source <source>", "event source", "cli:harmovela")
  .action((type, options) => run(() => emitCommand(type, options)));

program.command("subscribe")
  .description("Subscribe to Harmovela events through WebSocket")
  .option("--type <pattern>", "event type pattern", "*")
  .option("--url <url>", "WebSocket URL", "ws://127.0.0.1:8787/harmovela")
  .action((options) => run(() => subscribeCommand(options)));

program.command("dlq")
  .description("Inspect dead-lettered events")
  .argument("[subcommand]", "dlq subcommand", "list")
  .option("--config <path>", "config file path", process.env.HARMOVELA_CONFIG ?? "harmovela.config.json")
  .action((subcommand, options) => run(() => dlqCommand(subcommand, options)));

program.command("conformance")
  .description("Run Harmovela conformance fixtures")
  .option("--level <level>", "target conformance level")
  .action((options) => run(() => conformanceCommand(options)));

program.command("subscriptions")
  .description("Manage runtime subscriptions over HTTP")
  .argument("<subcommand>", "create | list | delete | stream")
  .argument("[id]", "subscription id for delete/stream")
  .option("--filter <json>", "subscription filter JSON", "{}")
  .option("--base <url>", "runtime API base URL", "http://127.0.0.1:8790/harmovela/api")
  .action((subcommand, id, options) => run(() => subscriptionsCommand(subcommand, id, options)));

program.parseAsync(process.argv);

async function run(fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`harmovela: ${err.message}`);
    process.exitCode = 1;
  }
}
