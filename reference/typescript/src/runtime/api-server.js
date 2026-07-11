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

  if (route === "/subscriptions" && req.method === "POST") {
    return handleCreateSubscription(service, req, res);
  }

  if (route === "/subscriptions" && req.method === "GET") {
    return sendJson(res, 200, { subscriptions: service.listSubscriptions() });
  }

  const subMatch = route && route.match(/^\/subscriptions\/([^/]+)(\/events|\/stream)?$/);
  if (subMatch) {
    const id = decodeURIComponent(subMatch[1]);
    const suffix = subMatch[2];
    if (!suffix && req.method === "GET") {
      const record = service.getSubscription(id);
      return record ? sendJson(res, 200, record) : sendJson(res, 404, { error: "not found" });
    }
    if (!suffix && req.method === "DELETE") {
      const deleted = await service.deleteSubscription(id);
      return deleted ? sendJson(res, 200, { deleted: true }) : sendJson(res, 404, { error: "not found" });
    }
    if (suffix === "/events" && req.method === "GET") {
      return handleLongPoll(service, id, res);
    }
    if (suffix === "/stream" && req.method === "GET") {
      return handleStream(service, id, req, res);
    }
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

async function handleCreateSubscription(service, req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  let body;
  try {
    body = raw.length > 0 ? JSON.parse(raw) : {};
  } catch {
    return sendJson(res, 400, { error: "invalid JSON body" });
  }
  const filter = body.filter ?? body;
  const record = await service.createSubscription(filter);
  return sendJson(res, 201, record);
}

function handleLongPoll(service, id, res) {
  if (!service.getSubscription(id)) return sendJson(res, 404, { error: "not found" });
  const events = service.takeEvents(id, 100);
  return sendJson(res, 200, { events });
}

function handleStream(service, id, req, res) {
  if (!service.getSubscription(id)) return sendJson(res, 404, { error: "not found" });
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  const buffered = service.takeEvents(id, 1000);
  for (const evt of buffered) res.write(`data: ${JSON.stringify(evt)}\n\n`);
  const detach = service.attachStream(id, (evt) => {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  });
  req.on("close", () => { if (detach) detach(); });
}
