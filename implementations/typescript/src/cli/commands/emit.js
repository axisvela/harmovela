import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

export async function emitCommand(type, options = {}) {
  if (!type) throw new Error("emit requires an event type");
  let payload;
  try { payload = JSON.parse(options.payload ?? "{}"); } catch { throw new Error("invalid JSON payload"); }
  const event = {
    spec_version: "0.2",
    id: options.id ?? randomUUID(),
    type,
    source: options.source ?? "cli:aep",
    created_at: new Date().toISOString(),
    payload
  };
  await sendWs(options.url ?? "ws://127.0.0.1:8787/aep", event);
  console.log(JSON.stringify(event));
}

function sendWs(url, event) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, ["aep-0.1"]);
    ws.on("open", () => { ws.send(JSON.stringify(event)); ws.close(); resolve(); });
    ws.on("error", reject);
  });
}
