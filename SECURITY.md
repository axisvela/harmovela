# Harmovela Protocol Security Response

> Status: public security-response process. This document defines how security vulnerabilities in the Harmovela Protocol specifications, schemas, conformance fixtures, and reference implementations are reported, triaged, fixed, and disclosed.

## Reporting a Vulnerability

Report security vulnerabilities privately to the Axisrobo security team at **security@axisrobo.com**. Do **not** open a public issue for a security vulnerability.

Include in your report:

- A description of the vulnerability and its potential impact.
- Steps to reproduce or a proof of concept.
- Affected protocol versions, specifications, or implementation languages.
- Any suggested mitigations.

## Response Timeline

| Phase | Target | Description |
|-------|--------|-------------|
| Acknowledge | 48 hours | Confirm receipt of the report and assign a tracker ID. |
| Triage | 5 business days | Assess severity, scope, and affected versions. |
| Fix development | Varies by severity | Develop and test a fix. Critical vulnerabilities prioritised. |
| Coordinated disclosure | Mutually agreed date | Publish fix, advisory, and CVE (if applicable). |

## Severity Classification

| Severity | Definition | Examples |
|----------|-----------|----------|
| Critical | Allows unauthorised event injection, session hijacking, or tenant isolation bypass with no mitigation. | Transport-layer auth bypass, envelope spoofing |
| High | Allows limited unauthorised access, denial of service, or data leak with practical exploit. | Subscription bypass, replay attack, dead-letter queue leak |
| Medium | Violates protocol conformance in a way that could cause interop failure or data loss under specific conditions. | Edge-case state machine violation, cursor corruption |
| Low | Minor spec deviation without practical exploit or data loss. | Missing validation of optional field, documentation gap |

## Disclosure Process

1. A security advisory is prepared describing the vulnerability, affected versions, and remediation.
2. Fixed versions are released to all four reference implementations (TypeScript, Python, Go, Java) simultaneously.
3. The advisory is published on the GitHub Security Advisories page and announced on relevant community channels.
4. A post-mortem is conducted for Critical and High severity issues, with findings published (redacted as needed).

## Supported Versions

During the 0.x pre-release phase, only the latest commit on the `main` branch is supported for security fixes. Once 1.0 is released, a formal supported-version policy will be established.

## Related Documents

- [Governance](GOVERNANCE.md) — governance structure and decision-making, including the security response procedure
- [Security](design/protocol/security.md) — identity, authorization, audit, and tenant isolation semantics
- [Releases](RELEASES.md) — release phases, versioning, and artifacts
- [Event Registry Governance](design/protocol/event-registry-governance.md) — event type registry governance
