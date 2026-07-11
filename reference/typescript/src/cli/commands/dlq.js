import { loadConfig, createDeliveryStore } from "../../runtime/config.js";

export async function dlqCommand(args) {
  const subcommand = args[0] ?? "list";
  if (subcommand !== "list") throw new Error(`unsupported dlq command: ${subcommand}`);
  const configPath = valueAfter(args, "--config") ?? process.env.AEP_CONFIG ?? "aep.config.json";
  const config = await loadConfig(configPath);
  const store = createDeliveryStore(config);
  await store.init?.();
  const stats = await store.getStats?.() ?? {};
  const records = await store.getDeadLettered?.() ?? [];
  console.log(JSON.stringify({ deadLettered: stats.deadLettered ?? records.length, records }));
  await store.close?.();
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
