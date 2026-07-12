# Layered Roadmap Review Fixes Design

**Goal:** Correct sequencing, release gates, history classification, and terminology in the Harmovela layered roadmap without changing protocol behavior, wire identifiers, schemas, or implementation code.

## Verified Problems

The roadmap review found six verified documentation defects:

1. L3 feedback/outcome and enforced-budget semantics are required for 1.0 but have no delivery milestone before the 0.9 validation-only release candidate.
2. The roadmap index claims each release has detailed entry and exit criteria, but the layer documents do not contain release-specific, observable gates.
3. The Event-layer history incorrectly places delegation, governance, security, and runtime-semantics work in the L0 substrate.
4. The L1 policy surface calls budget an implementer policy while L3 requires protocol-level enforcement, without defining the distinction.
5. The roadmap uses obsolete `AEP-C3` conformance terminology although the canonical current identifier is `HARMOVELA-C3`.
6. The 0.3 release describes delivery/security profile separation as future work even though profile definitions already exist.

## Chosen Approach

Use a minimal revision of the existing four-file roadmap structure. Do not add a separate release-document hierarchy. The correction adds one new release milestone, **0.5 Adaptation Preview**, after the existing 0.4 Beta and before the 0.9 Release Candidate.

Alternative approaches rejected:

- A release document per version would add unnecessary navigation and duplication at the current roadmap size.
- Moving L3 to a post-1.0 release would contradict the approved L3-as-1.0-ceiling direction.

## Changes

### Roadmap Index

- Change historical conformance references from `AEP-C3` to `HARMOVELA-C3`; retain `aep` only where it is an actual legacy artifact path.
- Add 0.5 Adaptation Preview to the release table.
- State that each layer file provides release-specific gates, not merely layer-level exit criteria.

### Event Layer

- Limit the delivered-history record to event-substrate work: envelope, session, subscriptions, transport, task streams, delivery/reliability, MCP bridge, and conformance.
- Move runtime semantics and delegation into Coordination history.
- Mark identity, authorization, audit, tenant isolation, and registry governance as cross-cutting governance foundations rather than L0 Event deliverables.
- Use `HARMOVELA-C3` as the current canonical level. Mention `AEP-C*` only as a legacy compatibility identifier where applicable.

### Coordination Layer

- Define L1 budgets as declared/advisory implementer policy: values may bound a runtime's task behavior but are neither protocol-enforced nor portable enforcement guarantees.
- Define the L3 distinction by linking to Adaptation: only L3 introduces protocol authority, enforcement, violation events, and conformance.
- Reframe 0.3 around the missing delegation/L2 profile plus security profile fixtures and declarations; do not schedule already-delivered delivery/security profile definitions.
- Add release-specific entry and exit gates for 0.2, 0.3, and 0.4, including lifecycle fixtures, compatibility policy, profile filtering, independent interoperability, public matrix, and governance proposal.

### Adaptation Layer

- Add 0.5 Adaptation Preview. It owns normative feedback/outcome correlation, budget authority/enforcement/violation semantics, L3 profile definition, and cross-language conformance fixtures.
- Make 0.9 strictly an RC validation stage for the already-delivered 0.5 semantics: RC fixtures/matrix, security response, registry process, external pilot, and no unresolved breaking changes.
- Add specific entry and exit gates for 0.5, 0.9, and 1.0.

## Boundaries

- This is documentation planning only. It does not claim the 0.5 or L3 artifacts are implemented.
- L4 open-ended autonomy and AGI remain explicit non-goals for 1.0.
- Existing protocol security profiles remain valid; the roadmap only corrects their status and enumerates unfinished conformance work.

## Verification

- Verify all links in `docs/roadmap.md` and `docs/roadmap/` resolve.
- Search roadmap prose for `AEP-C3`; remaining occurrences must be explicit legacy compatibility references only.
- Compare stated profile status with `docs/protocol/profiles.md` and canonical conformance levels with `conformance/manifest.json`.
