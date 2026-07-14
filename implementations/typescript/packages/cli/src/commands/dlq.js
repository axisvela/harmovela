import { loadConfig, createDeliveryStore } from "@axisrobo/harmovela-runtime";

export async function dlqCommand(subcommand = "list", options = {}) {
  if (subcommand !== "list") throw new Error(`unsupported dlq command: ${subcommand}`);
  const configPath = options.config ?? process.env.AEP_CONFIG ?? "aep.config.json";
  const config = await loadConfig(configPath);
  const store = createDeliveryStore(config);
  await store.init?.();
  const stats = await store.getStats?.() ?? {};
  const records = await store.getDeadLettered?.() ?? [];
  console.log(JSON.stringify({ deadLettered: stats.deadLettered ?? records.length, records }));
  await store.close?.();
}
