# client

Harmovela HTTP client SDK for Go.

```go
sdk := client.NewWithPath("http://127.0.0.1:8790", "/harmovela/api")

accepted, err := sdk.Publish(ctx, map[string]any{
    "spec_version": "0.2",
    "id":           "evt_1",
    "type":         "task.submitted",
    "source":       "my-service",
    "created_at":   "2026-11-10T00:00:00Z",
    "payload":      map[string]any{},
})

sub, err := sdk.CreateSubscription(ctx, map[string]any{"types": "task.*"})
events, err := sdk.Poll(ctx, sub["id"].(string))
err = sdk.Stream(ctx, sub["id"].(string), func(event map[string]any) {
    fmt.Println(event["type"], event["id"])
})
```

Methods: `Health`, `Publish`, `Stats`, `Pending`, `DeadLettered`,
`CreateSubscription`, `ListSubscriptions`, `GetSubscription`,
`DeleteSubscription`, `Poll`, and `Stream`.

`Publish` validates envelopes locally with the runtime's validation rules.
Non-2xx responses return `*client.Error`; invalid envelopes return
`*client.InvalidEventError`.
