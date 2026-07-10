# AEP Python Reference

Python is the second-priority reference implementation.

Run tests:

```sh
cd reference/python && pip install -e ".[test]" && python -m pytest
```

Current scope:

- Envelope required-field validation
- Standard draft event type registry
- Subscription pattern and routing metadata matching
- Session lifecycle state machine (opened / ready / closed / error)
- Task lifecycle tracking with valid state transitions
- Standard error model with typed error codes
- Event router with type-pattern dispatch
- Harness with capabilities, session, subscription, and task handling
- Transport bindings: stdio, WebSocket (server/client), SSE, gRPC (server/client)
- Pytest conformance tests using shared fixtures from `../../conformance/fixtures/`

Aligned with `reference/typescript/` behavior.
