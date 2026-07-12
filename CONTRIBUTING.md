# Contributing to AEP

Thank you for your interest in contributing to the Agent Event Protocol (AEP).

AEP is a draft open protocol. Contributions that refine the specification, improve reference implementations, add conformance coverage, or fix bugs are welcome.

## Getting Started

1. Read [`README.md`](README.md) and [`docs/roadmap.md`](docs/roadmap.md).
2. Check open issues for areas where help is needed.
3. For protocol changes, start with a design discussion before writing code.

## Repository Structure

| Directory | Purpose |
|---|---|
| `docs/specs/` | Protocol specifications by layer (session, subscription, task, error, delivery, etc.) |
| `.superpowers/specs/` | Design specs for planned features |
| `.superpowers/plans/` | Implementation plans |
| `schemas/` | Shared JSON Schema assets |
| `conformance/` | Shared conformance manifest and fixtures |
| `implementations/typescript/` | TypeScript reference (primary) |
| `implementations/python/` | Python reference |
| `implementations/go/` | Go reference |
| `implementations/java/` | Java reference |
| `tools/` | Development tools |

## How to Contribute

### Protocol Spec Changes

1. Start a discussion issue describing the proposed change and its motivation.
2. Draft the specification change in `docs/specs/<topic>.md`.
3. Update relevant JSON Schemas in `schemas/`.
4. Add conformance fixtures that exercise the new or changed behavior.
5. Update at least the TypeScript reference to match.
6. Cross-language parity is a goal but not a blocker for initial spec changes.

### New Language Reference

1. Create `implementations/<language>/` with a `README.md`.
2. Implement at minimum: envelope validation, event type registry, error model.
3. Load and pass the shared `conformance/manifest.json` fixtures at AEP-C0 and AEP-C1.
4. Follow the pattern established by the TypeScript reference.

### Bug Fixes and Improvements

1. Open an issue describing the bug.
2. Fix the bug with tests.
3. Ensure cross-language conformance passes: `node tools/conformance-runner.js`.

## Testing

```sh
# TypeScript
cd implementations/typescript && npm test && npm run conformance

# Python
cd implementations/python && python -m pytest --tb=short -q

# Go
cd implementations/go && go test ./aep/ -v

# Java
cd implementations/java && mvn test -q

# Cross-language
node tools/conformance-runner.js
```

## Code Style

- **TypeScript:** Node ESM, `node:test`, `node:assert`
- **Python:** pytest, snake_case, type hints
- **Go:** `testing.T`, camelCase, `gofmt`
- **Java:** JUnit 5, camelCase, JDK 21

## License

This project is licensed under the MIT License.
