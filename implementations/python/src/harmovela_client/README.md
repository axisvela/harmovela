# harmovela_client

Dependency-free Python client for the Harmovela HTTP API.

```python
from harmovela_client import HarmovelaClient

client = HarmovelaClient("http://127.0.0.1:8790")

client.publish({
    "spec_version": "0.2",
    "id": "evt_1",
    "type": "task.submitted",
    "source": "my-service",
    "created_at": "2026-11-10T00:00:00Z",
    "payload": {"task_id": "task_1"},
})

subscription = client.create_subscription({"types": "task.*"})
for event in client.stream(subscription["id"]):
    print(event["type"], event["id"])
```

## API

- `health()`
- `publish(event)` — validates the envelope locally before posting
- `stats()`, `pending()`, `dead_lettered()`
- `create_subscription()`, `list_subscriptions()`, `get_subscription()`
- `delete_subscription()`, `poll()`
- `stream(id)` — iterator of live SSE events
- `request(method, route, body)` — generic API escape hatch

Errors raise `HarmovelaClientError` with `status` and `body`.
