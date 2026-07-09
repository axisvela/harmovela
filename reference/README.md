# AEP Reference Implementations

Reference implementations are organized by language. Each language implementation should stay small, protocol-focused, and backed by shared conformance fixtures.

## Priority

1. `typescript/` — primary reference implementation and first runnable harness.
2. `python/` — second reference implementation, intended for agent runtimes, tooling, and testing workflows.
3. `go/` — later implementation for static binaries and infrastructure integrations.
4. `java/` — later implementation for JVM ecosystems and enterprise runtimes.

## Boundaries

- Keep protocol behavior consistent across languages.
- Prefer shared fixtures and conformance expectations over language-specific behavior.
- Do not make one implementation the protocol definition. The protocol definition lives in `docs/` and future shared schemas.
- Keep transport-specific code separate from envelope, event registry, and subscription matching logic.
