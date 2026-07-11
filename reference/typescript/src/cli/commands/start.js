import { startDaemon } from "../../runtime/server.js";

export async function startCommand(options = {}) {
  const configPath = options.config ?? process.env.AEP_CONFIG ?? "aep.config.json";
  await startDaemon({ configPath });
}
