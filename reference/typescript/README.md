# AEP TypeScript Reference

This is the first runnable AEP draft harness. It is currently zero-dependency Node ESM so the protocol draft can be exercised without a build step.

Run tests:

```sh
npm test
```

Run the stdio harness:

```sh
npm run harness < ../../conformance/fixtures/task-lifecycle.ndjson
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
- Deterministic shared fixtures from `../../conformance/fixtures/`
