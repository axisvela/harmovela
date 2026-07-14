import { startDaemon } from "@axisrobo/harmovela-runtime";

export async function startCommand(options = {}) {
  const configPath = options.config ?? process.env.AEP_CONFIG ?? "aep.config.json";
  await startDaemon({ configPath });
}
