# Go Package Restructure

- `aep/` (root) — core: envelope.go, router.go, subscription.go, errors.go, event_types.go, session.go, task/harness code migration from harness.go, fixtures.go, conformance_test.go, harness_test.go
- `aep/store/` — delivery_store.go (interface + in-memory), delivery_sqlite.go, delivery_postgres.go, delivery_journal.go, delivery.go (tracker), delivery_store_test.go, delivery_sqlite_test.go, delivery_postgres_test.go, delivery_journal_test.go, delivery_test.go
- `aep/transport/` — all transport_*.go files
- `aep/runtime/` — runtime.go, runtime_test.go, runtime_subscriptions_test.go
- `aep/bridge/` — mcp_bridge.go, mcp_bridge_test.go
