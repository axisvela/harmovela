import { WebSocket } from "ws";
import { matchesType } from "../../subscription.js";

export async function subscribeCommand(options = {}) {
  const pattern = options.type ?? "*";
  const url = options.url ?? "ws://127.0.0.1:8787/aep";
  const ws = new WebSocket(url, ["aep-0.1"]);
  ws.on("message", (data) => {
    const event = JSON.parse(data.toString());
    if (matchesType(pattern, event.type)) console.log(JSON.stringify(event));
  });
  ws.on("error", (err) => { console.error(`subscribe: ${err.message}`); process.exitCode = 1; });
  process.on("SIGINT", () => { ws.close(); process.exit(0); });
}
