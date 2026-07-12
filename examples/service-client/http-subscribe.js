#!/usr/bin/env node
function argValue(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const base = argValue("--base", "http://127.0.0.1:8790/aep/api");

async function main() {
  const createRes = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter: { types: "task.*" } })
  });
  const { id } = await createRes.json();

  await fetch(`${base}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spec_version: "0.2",
      id: "evt_http",
      type: "task.submitted",
      source: "example:service",
      created_at: new Date().toISOString(),
      payload: { task_id: "task_01" }
    })
  });

  const eventsRes = await fetch(`${base}/subscriptions/${id}/events`);
  const body = await eventsRes.json();
  for (const event of body.events) {
    console.log(`received ${event.id}`);
  }
}

main().catch((err) => {
  console.error(`http-api-client: ${err.message}. Is harmovelad running?`);
  process.exitCode = 1;
});
