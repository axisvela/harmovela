# Harmovela Protocol Governance

> Status: draft. Governance model evolves toward 1.0.

## Purpose

This document defines how the Harmovela Protocol is governed: who makes decisions, how changes are proposed and accepted, and how the project transitions from a founding-organization model to independent multi-party governance.

## Governance Structure

### Founding Organization

Axisrobo is the founding organization of the Harmovela Protocol. Axisrobo initiated the protocol design, maintains the canonical repository (`https://github.com/axisrobo/harmovela`), and stewards the 0.x draft phase.

Axisrobo maintainers hold final decision-making authority over the specification, event type registry, conformance fixtures, and implementation repositories during the pre-1.0 phase.

### Maintainer Responsibilities

Maintainers are responsible for:

- Reviewing and merging protocol specification changes
- Ensuring cross-language consistency across reference implementations
- Maintaining conformance fixture integrity
- Enforcing versioning and compatibility policies
- Upholding the code of conduct

### Future: Multi-Party Governance

The Harmovela Protocol intends to establish independent multi-party governance before the 1.0 release. The goal is a governance structure that includes:

- Representation from multiple organizations and independent contributors
- A documented decision-making process with clear escalation paths
- A technical steering committee responsible for protocol evolution
- Transparent processes for specification changes, event registry updates, and conformance decisions

The specific governance model (e.g., foundation-hosted, community-driven steering group, or standards-body affiliation) will be determined through community discussion during the 0.5 beta phase, with a target of being operational before 1.0.

## Decision-Making

### Protocol Changes

Protocol specification changes require the following process:

1. **Proposal**: A documented proposal (GitHub issue or discussion) describing the change, its motivation, and impact analysis.
2. **Specification update**: A pull request updating the relevant specification document(s) in `docs/protocol/`.
3. **Conformance fixture update**: Corresponding updates to shared conformance fixtures in `conformance/fixtures/` that exercise the new or changed behavior.
4. **Maintainer review**: At least one Axisrobo maintainer must review and approve the change.
5. **Cross-language consistency**: At least the TypeScript reference implementation must be updated to match. Parity across Python, Go, and Java is expected but not gating for initial spec changes; cross-language parity should follow within a reasonable timeframe.

### Event Registry Changes

Event type registry governance follows `docs/protocol/event-registry-governance.md`. New event types or event families require:

- A proposal describing the type, its semantics, and its relationship to existing families
- Registration in all four language event type registries
- At least one conformance fixture exercising the new type
- Maintainer review

### Compatibility Decisions

All compatibility decisions follow `docs/protocol/versioning.md`. Breaking changes to the core protocol envelope, required event families, or delivery semantics require a major version change. During the 0.x phase, breaking changes are permitted but must be documented with migration guidance.

### Informal Decisions

Bug fixes, documentation improvements, example updates, and non-semantic implementation changes may proceed through the standard pull request process without a formal proposal, provided they do not alter protocol behavior or conformance expectations.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). All participants in governance processes are expected to uphold it.

## License

All governance documents, protocol specifications, schemas, and conformance fixtures are licensed under the [Apache License 2.0](LICENSE). Implementations may be licensed under the same terms. Contributions are accepted under the Apache 2.0 license as described in [CONTRIBUTING.md](CONTRIBUTING.md).

## Related Documents

- [Governance](GOVERNANCE.md) (`GOVERNANCE.md`) — this document
- [Releases](RELEASES.md) (`RELEASES.md`) — release phases, versioning, and artifacts
- [Trademarks](TRADEMARKS.md) (`TRADEMARKS.md`) — name and mark usage guidelines
- [Versioning](docs/protocol/versioning.md) — protocol versioning rules
- [Event Registry Governance](docs/protocol/event-registry-governance.md) — event type registry governance
- [Contributing](CONTRIBUTING.md) — contribution guidelines
- [Code of Conduct](CODE_OF_CONDUCT.md) — community standards
