# Java Reference Implementation Design

Date: 2026-07-10

## Goal

Add a minimal Java reference implementation under `implementations/java/` that passes AEP-C0 and AEP-C1 conformance against the shared fixture manifest.

This gives the project a fourth language pillar and validates protocol neutrality across typed/VM languages.

## Non-Goals

- Do not implement transports (stdio, WebSocket, SSE) in Java yet.
- Do not implement delivery tracking, retry policy, or dead-letter in Java.
- Do not add JSON Schema validation in Java; field-level validation is sufficient for C1.
- Do not introduce concurrency, threads, or async patterns. The harness is synchronous.
- Do not add a CLI, production server, or example demos.

## Approach

Same minimal pattern as the Go reference: typed classes, validation, fixture reader, synchronous harness, and JUnit 5 table-driven tests against the shared manifest. Use Java idioms (records, sealed types, `List.of`, pattern matching where appropriate) with JDK 21.

## Tech Stack

- **JDK 21** â€?modern Java with records, switch expressions, text blocks
- **Maven** â€?build tool, no wrapper needed
- **JUnit 5** â€?`@Test`, `@ParameterizedTest`, assertions
- **Jackson Databind** â€?JSON parsing (single dependency, standard)
- **GroupId**: `com.axisrobo`, **ArtifactId**: `aep-reference-java`

## Components

### Build

`pom.xml` with:
- `maven.compiler.release = 21`
- Dependencies: Jackson `jackson-databind` 2.17+, JUnit 5, no others

### Package Structure

All sources under `com.axisrobo.aep`:

```
src/main/java/com/axisrobo/aep/
  Envelope.java      â€?validate(Map<String,Object>) returns List<String>
  EventTypes.java    â€?static Set<String> STANDARD_TYPES + isStandardEventType()
  Errors.java        â€?static error code constants + errorPayload()
  EventRouter.java   â€?handler registration + dispatch
  Session.java       â€?session state machine
  Harness.java       â€?Harness + TaskTracker, C1 behavior
  Fixtures.java      â€?manifest + NDJSON loader
src/test/java/com/axisrobo/aep/
  EnvelopeTest.java
  EventRouterTest.java
  HarnessTest.java
  ConformanceTest.java
```

### Envelope Validation

`Validate(Map<String,Object>) -> List<String>` â€?mirrors Go `ValidateEnvelope`:
- Required string fields: aep_version, id, type, source, created_at
- Payload presence
- Type against standard registry
- Protocol version == "0.1"
- ISO 8601 created_at
- Delivery mode validation
- Subscription payload field validation

### Event Router

- `EventRouter` with `on(Predicate<Map>, Function<Map,Object>)` and `onAll(Function<Map,Object>)`.
- `dispatch(Map<String,Object>) -> List<Map<String,Object>>`.
- Handler returns `null`, `Map`, `List<Map>`, or `List<Object>` of Maps.

### Harness

- `Harness` with `handle(Map<String,Object>) -> List<Map<String,Object>>`.
- `TaskTracker` inner class with state machine (submitted â†?accepted â†?started â†?progress/blocked/output â†?completed/failed/cancelled/timed_out).
- Handles: capabilities, subscriptions, sessions, task lifecycle.
- Matches TypeScript `AepHarness` behavior exactly.

### Conformance Test

- Reads `../../conformance/manifest.json`.
- Filters to AEP-C1 target level.
- For each fixture: validates envelopes, checks expected types.
- For `stateful_flow`: feeds through `Harness.handle()` and asserts no `event.rejected`.
- C2 fixtures are skipped.

## Testing

```sh
cd implementations/java && mvn test
```

Verification:
```sh
cd implementations/java && mvn test
cd implementations/typescript && npm test && npm run conformance
cd implementations/python && python -m pytest --tb=short -q
cd implementations/go && go test ./aep/ -v
```

## Open Decisions Resolved

- JDK 21 with Maven, JUnit 5, Jackson.
- No Spring, no concurrency, no transports.
- Synchronous-only harness matching Go scope.
- Conformance tests consume the same shared manifest.
