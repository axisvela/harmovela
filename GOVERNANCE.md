# Harmovela Protocol Governance

> Status: draft. Community governance model evolves toward 1.0. Current decision authority rests with Axisrobo maintainers during the 0.x phase.

## Purpose

This document defines how the Harmovela Protocol is governed: who makes decisions, how changes are proposed and accepted, the contribution path, the RFC process, the security response procedure, and how the project transitions from a founding-organization model to independent multi-party governance.

## Governance Structure

### Founding Organization

Axisrobo is the founding organization of the Harmovela Protocol. Axisrobo initiated the protocol design, maintains the canonical repository (`https://github.com/axisrobo/harmovela`), and stewards the 0.x draft phase.

Axisrobo maintainers hold final decision-making authority over the specification, event type registry, conformance fixtures, and implementation repositories during the pre-1.0 phase.

### Maintainer Responsibilities

Maintainers are responsible for:

- Reviewing and merging protocol specification changes.
- Ensuring cross-language consistency across TypeScript, Python, Go, and Java reference implementations.
- Maintaining conformance fixture integrity and cross-language runner health.
- Enforcing versioning and compatibility policies as defined in `docs/protocol/versioning.md` and `docs/protocol/compatibility-matrix.md`.
- Upholding the [Code of Conduct](CODE_OF_CONDUCT.md).
- Responding to security disclosures within the committed response window.
- Triaging issues, RFCs, and pull requests in a timely manner.

### Maintainer Onboarding

New maintainers are nominated by existing maintainers based on sustained, high-quality contributions. Nomination requires:

- A history of accepted PRs across at least one specification document and one reference implementation.
- Demonstrated understanding of the protocol's coordination dimensions.
- Endorsement from at least two existing maintainers.
- Acceptance of the maintainer responsibilities and code of conduct.

### Future: Multi-Party Governance

The Harmovela Protocol intends to establish independent multi-party governance before the 1.0 release. The goal is a governance structure that includes:

- Representation from multiple organizations and independent contributors.
- A documented decision-making process with clear escalation paths.
- A technical steering committee (TSC) responsible for protocol evolution.
- Transparent processes for specification changes, event registry updates, and conformance decisions.

The specific governance model (e.g. foundation-hosted, community-driven steering group, or standards-body affiliation) will be determined through community discussion during the 0.5 Beta phase, with a target of being operational before 1.0.

## Decision-Making Process

### Consensus and Lazy Consensus

The default decision-making model is **consensus-seeking**. Proposals without objections within a reasonable review period (7 calendar days for specification changes, 3 calendar days for bug fixes and minor improvements) may proceed under **lazy consensus**.

Objections must be substantive and relate to protocol correctness, compatibility, security, or conformance. An objection must include a specific rationale and, where possible, a suggested alternative.

### Escalation Path

1. **PR discussion**: All decisions begin as pull request or issue discussion.
2. **Maintainer tie-break**: If consensus is not reached, an Axisrobo maintainer makes a decision.
3. **Recorded decision**: Tie-break decisions are documented in the PR or a decision record under `docs/design/decisions/` with rationale.
4. **Appeal**: Community members may appeal a decision by opening a new issue with "Decision Appeal: <topic>" and new evidence or analysis. Maintainers reconsider, but the second decision is final during the 0.x phase.

### Decision Types

| Decision Type | Process | Review Period | Approver |
|--------------|---------|--------------|----------|
| Protocol specification change | RFC or detailed PR | 7 days | Axisrobo maintainer |
| New event type or event family | Proposal + registry update + fixture | 7 days | Axisrobo maintainer |
| Conformance fixture change | PR with fixture diff | 3 days | Axisrobo maintainer |
| Reference implementation change (non-semantic) | Standard PR | 3 days | Axisrobo maintainer |
| Bug fix | Standard PR | 3 days | Axisrobo maintainer |
| Documentation improvement | Standard PR | 3 days | Axisrobo maintainer |
| Security fix | Coordinated disclosure (see Security Response) | As needed | Axisrobo maintainer |
| Compatibility decision | RFC + compatibility matrix update | 7 days | Axisrobo maintainer |

## Contribution Path

### Contributor Journey

```
Observer → Contributor → Repeat Contributor → Maintainer Nominee → Maintainer
```

1. **Observer**: Reads specifications, uses implementations, opens issues.
2. **Contributor**: First accepted PR (documentation, bug fix, or feature). Added to CONTRIBUTORS.
3. **Repeat Contributor**: Multiple accepted PRs across different areas (spec, implementation, conformance).
4. **Maintainer Nominee**: Nominated by existing maintainers based on sustained contribution quality.
5. **Maintainer**: Onboarded with merge access and decision authority.

### Pull Request Requirements

All PRs must:

- Reference an existing issue or RFC (except trivial fixes).
- Include or update tests where applicable.
- Pass cross-language conformance (`node tools/conformance-runner.js`).
- Follow the code style documented in `CONTRIBUTING.md`.
- Not introduce breaking changes without a documented compatibility decision.

### Contributor License

All contributions are accepted under the [Apache License 2.0](LICENSE) as described in [CONTRIBUTING.md](CONTRIBUTING.md). By submitting a PR, contributors agree to license their work under these terms.

## RFC Process

### When an RFC is Required

An RFC (Request for Comments) is required for:

- New protocol features or specification changes.
- New event type families.
- Changes to the protocol envelope or required fields.
- Changes to conformance levels or fixture expectations.
- Breaking changes to any reference implementation.
- Changes to governance, versioning, or compatibility policies.

An RFC is not required for:

- Bug fixes that restore intended behavior.
- Documentation improvements.
- Non-semantic refactoring.
- Adding tests for existing behavior.

### RFC Workflow

1. **Proposal**: Open a GitHub issue with title "RFC: <summary>" containing:
   - Motivation and problem statement.
   - Proposed solution with enough detail for evaluation.
   - Impact analysis: which specs, fixtures, and implementations are affected.
   - Alternatives considered.
2. **Discussion**: Community and maintainers discuss the proposal. The discussion period is at least 7 days.
3. **Decision**: A maintainer posts a decision comment: Accepted, Rejected, or Needs Revision. Accepted RFCs link to an implementation PR. Rejected RFCs include rationale. Needs Revision RFCs return to step 1.
4. **Implementation**: An accepted RFC is implemented via one or more PRs referencing the RFC issue.
5. **Closure**: The RFC issue is closed when all implementation PRs are merged and conformance passes.

### RFC Lifecycle States

| State | Meaning |
|-------|---------|
| `proposed` | RFC issue opened, under discussion |
| `accepted` | Maintainer approved; awaiting implementation |
| `rejected` | Maintainer declined with rationale |
| `implemented` | All PRs merged, conformance passes |
| `superseded` | Replaced by a later RFC |
| `withdrawn` | Author withdrew the proposal |

## Security Response

### Reporting a Vulnerability

Security vulnerabilities should be reported privately to the Axisrobo security team at `security@axisrobo.com`. Do not open a public issue.

Include in your report:

- A description of the vulnerability and its potential impact.
- Steps to reproduce or a proof of concept.
- Affected protocol versions, specifications, or implementation languages.
- Any suggested mitigations.

### Response Timeline

| Phase | Target | Description |
|-------|--------|-------------|
| Acknowledge | 48 hours | Confirm receipt of the report and assign a tracker ID. |
| Triage | 5 business days | Assess severity, scope, and affected versions. |
| Fix development | Varies by severity | Develop and test a fix. Critical vulnerabilities prioritised. |
| Coordinated disclosure | Mutually agreed date | Publish fix, advisory, and CVE (if applicable). |

### Severity Classification

| Severity | Definition | Examples |
|----------|-----------|----------|
| Critical | Allows unauthorised event injection, session hijacking, or tenant isolation bypass with no mitigation. | Transport-layer auth bypass, envelope spoofing |
| High | Allows limited unauthorised access, denial of service, or data leak with practical exploit. | Subscription bypass, replay attack, dead-letter queue leak |
| Medium | Violates protocol conformance in a way that could cause interop failure or data loss under specific conditions. | Edge-case state machine violation, cursor corruption |
| Low | Minor spec deviation without practical exploit or data loss. | Missing validation of optional field, documentation gap |

### Disclosure Process

1. A security advisory is prepared describing the vulnerability, affected versions, and remediation.
2. Fixed versions are released to all four reference implementations (TypeScript, Python, Go, Java) simultaneously.
3. The advisory is published on the GitHub Security Advisories page and announced on relevant community channels.
4. A post-mortem is conducted for Critical and High severity issues, with findings published (redacted as needed).

### Supported Versions

During the 0.x pre-release phase, only the latest commit on the `main` branch is supported for security fixes. Once 1.0 is released, a formal supported-version policy will be established.

## Compatibility and Versioning

All compatibility decisions follow `docs/protocol/versioning.md` and the [compatibility matrix](docs/protocol/compatibility-matrix.md). Breaking changes to the core protocol envelope, required event families, or delivery semantics require a major version change. During the 0.x phase, breaking changes are permitted but must be documented with migration guidance and a compatibility decision record.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). All participants in governance processes are expected to uphold it. Violations may result in removal from governance roles.

## License

All governance documents, protocol specifications, schemas, and conformance fixtures are licensed under the [Apache License 2.0](LICENSE). Implementations may be licensed under the same terms. Contributions are accepted under the Apache 2.0 license as described in [CONTRIBUTING.md](CONTRIBUTING.md).

## Related Documents

- [Contributing](CONTRIBUTING.md) — contribution guide and repository conventions
- [Code of Conduct](CODE_OF_CONDUCT.md) — community standards
- [Releases](RELEASES.md) — release phases, versioning, and artifacts
- [Trademarks](TRADEMARKS.md) — name and mark usage guidelines
- [Roadmap](docs/roadmap.md) — milestones toward 1.0
- [Versioning](docs/protocol/versioning.md) — protocol versioning rules
- [Compatibility Matrix](docs/protocol/compatibility-matrix.md) — legacy identifier migration inventory
- [Event Registry Governance](docs/protocol/event-registry-governance.md) — event type registry governance
- [Security](docs/protocol/security.md) — identity, authorization, audit, tenant isolation
