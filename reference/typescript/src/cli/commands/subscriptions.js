export async function subscriptionsCommand(subcommand, arg, options = {}) {
  const base = options.base ?? "http://127.0.0.1:8790/aep/api";
  switch (subcommand) {
    case "create": return createSubscription(base, options.filter ?? "{}");
    case "list": return listSubscriptions(base);
    case "delete": return deleteSubscription(base, arg);
    case "stream": return streamSubscription(base, arg);
    default: throw new Error(`unknown subscriptions command: ${subcommand}`);
  }
}

async function createSubscription(base, filterText) {
  let filter;
  try { filter = JSON.parse(filterText); } catch { throw new Error("invalid JSON filter"); }
  const res = await fetchOrThrow(`${base}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter })
  });
  console.log(await res.text());
}

async function listSubscriptions(base) {
  const res = await fetchOrThrow(`${base}/subscriptions`);
  console.log(await res.text());
}

async function deleteSubscription(base, id) {
  if (!id) throw new Error("delete requires a subscription id");
  let res;
  try {
    res = await fetch(`${base}/subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    throw new Error(`request failed: ${err.message}. Is aepd running?`);
  }
  if (res.status === 404) throw new Error("not found");
  if (!res.ok) throw new Error(`request failed: HTTP ${res.status}`);
  console.log(await res.text());
}

async function streamSubscription(base, id) {
  if (!id) throw new Error("stream requires a subscription id");
  let res;
  try {
    res = await fetch(`${base}/subscriptions/${encodeURIComponent(id)}/stream`, {
      headers: { Accept: "text/event-stream" }
    });
  } catch (err) {
    throw new Error(`request failed: ${err.message}. Is aepd running?`);
  }
  if (res.status === 404) throw new Error("not found");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith("data: ")) console.log(line.slice("data: ".length));
    }
  }
}

async function fetchOrThrow(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new Error(`request failed: ${err.message}. Is aepd running?`);
  }
  if (!res.ok) throw new Error(`request failed: HTTP ${res.status}`);
  return res;
}
