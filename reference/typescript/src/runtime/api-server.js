import http from "node:http";

export function startApiServer(service, options) {
  const base = options.path ?? "/aep/api";
  const server = http.createServer((req, res) => {
    handle(service, base, req, res).catch((err) => {
      sendJson(res, 500, { error: err.message });
    });
  });
  return new Promise((resolve) => {
    server.listen(options.port ?? 0, options.host ?? "127.0.0.1", () => {
      const addr = server.address();
      resolve({
        port: addr.port,
        stop: () => new Promise((done) => server.close(done))
      });
    });
  });
}

async function handle(service, base, req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : null;

  if (route === "/healthz" && req.method === "GET") {
    return sendJson(res, 200, {
      status: "ok",
      runtime: service.config.runtime,
      delivery: await service.getStats()
    });
  }

  if (route === "/events" && req.method === "POST") {
    return handleIngest(service, req, res);
  }

  if (route === "/dlq" && req.method === "GET") {
    const records = await service.getDeadLettered();
    return sendJson(res, 200, { deadLettered: records.length, records });
  }

  if (route === "/pending" && req.method === "GET") {
    const records = await service.getPending();
    return sendJson(res, 200, { pending: records.length, records });
  }

  if (route === "/stats" && req.method === "GET") {
    return sendJson(res, 200, await service.getStats());
  }

  return sendJson(res, 404, { error: "not found" });
}

async function handleIngest(service, req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return sendJson(res, 400, { accepted: false, errors: ["invalid JSON body"] });
  }
  try {
    service.publish(event);
  } catch (err) {
    const errors = err.message.startsWith("invalid AEP event: ")
      ? err.message.slice("invalid AEP event: ".length).split("; ")
      : [err.message];
    return sendJson(res, 400, { accepted: false, errors });
  }
  return sendJson(res, 202, { accepted: true, id: event.id });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
