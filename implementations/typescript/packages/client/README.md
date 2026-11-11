# @axisvela/harmovela-client

Dependency-free JavaScript client for the Harmovela HTTP API. It covers event
publication, subscriptions, polling, live SSE streams, and delivery inspection.

```js
import { HarmovelaClient } from "@axisvela/harmovela-client";

const client = new HarmovelaClient({
  baseUrl: "http://127.0.0.1:8790",
  path: "/aep/api"
});

await client.publish({
  spec_version: "0.2",
  id: "evt_1",
  type: "task.submitted",
  source: "my-service",
  created_at: new Date().toISOString(),
  payload: { task_id: "task_1" }
});

const subscription = await client.createSubscription({ types: "task.*" });
const buffered = await client.poll(subscription.id);

const controller = new AbortController();
await client.stream(
  subscription.id,
  (event) => console.log(event.type, event.id),
  { signal: controller.signal }
);
```

## API

- `health()` — runtime and delivery status
- `publish(event)` — validates the envelope locally, then posts it
- `stats()`, `pending()`, `deadLettered()` — delivery inspection
- `createSubscription(filter)`, `listSubscriptions()`, `getSubscription(id)`
- `deleteSubscription(id)`, `poll(id)` — subscription lifecycle and buffered events
- `stream(id, onEvent, { signal })` — SSE live stream
- `request(method, route, body)` — generic API escape hatch

Non-2xx responses throw `HarmovelaClientError` with `status` and `body`.
The client uses the caller's `fetch` implementation when supplied, so tests can
run without network access.
