# AEP TypeScript Reference

This is the first runnable AEP draft harness. It uses Node ESM so the protocol draft can be exercised without a build step.

Install dependencies:

```sh
npm install
```

Run tests:

```sh
npm test
```

Run conformance fixtures:

```sh
npm run conformance
```

Run the stdio harness:

```sh
npm run harness < ../../conformance/fixtures/task-lifecycle.ndjson
```

Run examples:

```sh
npm run demo:async-tool
npm run demo:memory
npm run demo:agent
npm run demo:mcp-bridge
npm run demo:mcp-aep-consumer
```

Current scope:

- Envelope required-field validation
- Standard draft event type registry
- Subscription pattern and routing metadata matching
- Session lifecycle state machine (opened / ready / heartbeat / closed / error)
- Task lifecycle tracking with valid state transitions (submitted through completed, failed, cancelled, timed out)
- Standard error model with typed error codes and retryability
- Event router with type-pattern dispatch
- Stdio newline-delimited JSON harness
- WebSocket and HTTP SSE transport bindings
- JSON Schema validation with shared schemas
- Delivery tracking with ack/retry/dead-letter helpers
- MCP bridge, bridge demo, and MCP+AEP consumer demo
- Async tool producer, memory event producer, and agent subscriber demos
- Deterministic shared fixtures from `../../conformance/fixtures/`
