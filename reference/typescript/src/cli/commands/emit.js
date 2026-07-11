import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";

export async function emitCommand(args) {
  const type = args[0];
  if (!type) throw new Error("emit requires an event type");
  const payloadText = valueAfter(args, "--payload") ?? "{}";
  let payload;
  try { payload = JSON.parse(payloadText); } catch { throw new Error("invalid JSON payload"); }
  const url = valueAfter(args, "--url") ?? "ws://127.0.0.1:8787/aep";
  const event = {
    aep_version: "0.1",
    id: valueAfter(args, "--id") ?? randomUUID(),
    type,
    source: valueAfter(args, "--source") ?? "cli:aep",
    created_at: new Date().toISOString(),
    payload
  };
  await sendWs(url, event);
  console.log(JSON.stringify(event));
}

function sendWs(url, event) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, ["aep-0.1"]);
    ws.on("open", () => { ws.send(JSON.stringify(event)); ws.close(); resolve(); });
    ws.on("error", reject);
  });
}

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
