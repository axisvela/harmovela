# Harmovela Conformance Matrix

## Core

| Level | TypeScript | Python | Go | Java |
|---|---|---|---|---|
| HARMOVELA-C0 | PASS | PASS | PASS | PASS |
| HARMOVELA-C1 | PASS | PASS | PASS | PASS |

## Profiles

### Delivery

| Level | TypeScript | Python | Go | Java |
|---|---|---|---|---|
| HARMOVELA-C2 | PASS | PASS | PASS | PASS |
| HARMOVELA-C3 | PASS | PASS | PASS | PASS |

### Runtime Semantics

| Level | TypeScript | Python | Go | Java |
|---|---|---|---|---|
| HARMOVELA-C0* | PASS | PASS | PASS | PASS |

*Runtime semantics profile uses HARMOVELA-C0 level for fixture validation.

## How to Verify

```sh
# All core + all profiles:
node tools/conformance-runner.js

# Core only:
node tools/conformance-runner.js --profile=default

# Specific profile:
node tools/conformance-runner.js --profile=delivery
```

## Interpretation

- PASS: All fixtures at the declared level validate correctly with zero failures.
- FAIL: At least one fixture fails envelope/schema validation or harness flow.
- SKIP: Not applicable (e.g. profile not implemented or unsupported level).
