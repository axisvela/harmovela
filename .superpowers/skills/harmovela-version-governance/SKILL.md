---
name: harmovela-version-governance
description: Use when changing Harmovela roadmaps, release records, profiles, schemas, wire identifiers, package versions, or conformance claims that include a version or delivery status.
---

# Harmovela Version Governance

## Overview

Never infer one Harmovela version from another. Protocol, profile, implementation, and milestone versions are independent contracts. Historical documents may use older mixed terminology and must not be rewritten or used as proof for future release gates.

## Required Classification

Classify every version/status statement before editing:

| Axis | Meaning | Examples |
| --- | --- | --- |
| Protocol | Harmovela specification and wire-compatibility release | `Harmovela Protocol 0.5`, `1.0` |
| Profile | Optional capability contract | `harmovela.coordination.v1` |
| Implementation | One language artifact, SDK, daemon, or CLI | TypeScript package `0.5.0` |
| Milestone | Project work state; not a release version | `M-Coordination-Interop` |

`0.x` in `docs/roadmap.md` and `RELEASES.md` is a **Protocol** version unless explicitly labeled otherwise.

## Mandatory Gate

Before changing any roadmap, release, profile, schema, manifest, package, CLI, daemon, endpoint, environment variable, or wire field:

1. State the affected version axis or axes.
2. Identify the authoritative document for each axis.
3. State whether the change is wire-compatible, wire-breaking, implementation-only, or milestone-only.
4. For a Protocol release claim, list the required profile versions, implementation versions, fixtures, and conformance evidence. Do not infer them.
5. Stop and ask for an explicit compatibility decision before changing schema IDs, serialized fields, transport subprotocols, endpoint paths, CLI/daemon names, environment variables, package namespaces, or conformance identifiers.

## Rules

- An implementation release never proves a Protocol release.
- A profile version never equals a Protocol version unless an explicit release decision says so.
- A completed milestone never authorizes a later Protocol release.
- A Protocol release does not authorize changing wire identifiers unless its compatibility decision explicitly lists them.
- `RELEASES.md` records Protocol releases only. It may link to profiles and implementations but must label them by axis.
- Roadmap gates must name their axis and evidence. A gate without an axis is planning text, not release evidence.
- Keep historical documents unchanged. Add new clarification only in current governance/release documents; do not retroactively reinterpret historical status.

## Required Evidence

| Claim | Required evidence |
| --- | --- |
| Protocol release | Approved compatibility decision, frozen spec/profile set, conformance matrix, release criteria |
| Profile release | Profile ID/version, dependencies, negotiation, fixtures, declared implementations |
| Implementation release | Language artifact version, tests, package-specific changelog |
| Milestone completion | Named acceptance criteria and recorded results; no implied protocol release |

## Red Flags

- "The CLI is 1.0.0, so Protocol 1.0 is released."
- "Profile v1 means protocol 1.0."
- "Rename `spec_version` because the package version changed."
- "Mark a roadmap release delivered because one language passed tests."
- "The old release document says 0.3 delivered, so its future gate is complete."
- "This is only a documentation rename, so no compatibility decision is needed."

Any red flag means stop, classify the axes, and request an explicit decision.

## Rationalizations

| Excuse | Reality |
| --- | --- |
| "RELEASES says the old phase was delivered." | Historical status cannot prove a future gate or redefine a version axis. |
| "One implementation has the matching number." | Implementation versions are independent release artifacts. |
| "The profile is v1, so the protocol is 1.0." | Profile and Protocol compatibility contracts are separate. |
| "It is only a schema/document rename." | Schema and wire identifiers require an explicit compatibility decision. |

## Verification

Before completion, review changed version statements and confirm:

- Every version has a labeled axis.
- No Protocol status is inferred from a profile, implementation, or milestone.
- Legacy identifiers remain only where an explicit compatibility decision permits them.
- Historical documents were not changed unless explicitly requested.
