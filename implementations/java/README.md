# AEP Java Reference

Java reference implementation of the Agent Event Protocol draft.

## Setup

Requirements: JDK 21, Maven 3.9+.

```sh
cd reference/java
mvn compile
```

## Run Tests

```sh
mvn test
```

## HTTP Client SDK

`com.axisvela.harmovela.client.HarmovelaClient` covers publish, subscriptions,
polling, SSE streams, and delivery inspection.

```java
var client = new HarmovelaClient("http://127.0.0.1:8790");
client.publish(Map.of(
        "spec_version", "0.2",
        "id", "evt_1",
        "type", "task.submitted",
        "source", "my-service",
        "created_at", Instant.now().toString(),
        "payload", Map.of()));
var subscription = client.createSubscription(Map.of("types", "task.*"));
client.stream((String) subscription.get("id"), event -> System.out.println(event));
```

## Current Scope

- Typed envelope and field-level validation
- Standard draft event type registry
- Standard error model with typed error codes
- Event router with pattern-matching dispatch
- Session lifecycle state machine (opened, ready, closed, error)
- Task lifecycle tracking with valid state transitions
- Subscription create and cancel
- Manifest-driven C0 and C1 conformance tests
- Delivery tracking with ack/retry/dead-letter helpers, pluggable store, and event journal
- Transport bindings: stdio, WebSocket, SSE, gRPC
- Shared fixture integration from `../../conformance/fixtures/`
- HTTP client SDK for publish, subscriptions, polling, SSE streams, and delivery
  inspection
