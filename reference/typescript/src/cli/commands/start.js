import { startDaemon } from "../../runtime/server.js";

export async function startCommand(args) {
  const configPath = valueAfter(args, "--config") ?? process.env.AEP_CONFIG ?? "aep.config.json";
  await startDaemon({ configPath });
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
