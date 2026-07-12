# Layered Roadmap Rewrite Design

**Goal:** Reorganize the Harmovela roadmap around a capability maturity stack — **Event → Coordination → Adaptation** — split across multiple files, with every past and future phase mapped to a layer.

## Motivation

The current `docs/roadmap.md` is a flat, chronological phase list (Phase 0–8 complete, then a 0.1→1.0 release path). It mixes three unrelated lenses (protocol layers, delivery timeline, autonomy ladder) and still uses the legacy "AEP" name in prose. It does not express the project's actual direction of travel: events are only the substrate, coordination is the current frontier, and feedback / adaptation / self-evolution is the next horizon.

## Capability Maturity Model

Harmovela's value grows through three stacked layers. Each layer depends on the one below and is only meaningful once the lower layer is stable.

| Layer | Question it answers | Autonomy mapping | Status |
| --- | --- | --- | --- |
| **Event** | "What happened?" — typed, correlatable communication substrate | L0 | Delivered / stable |
| **Coordination** | "Who does what, on what shared truth?" — delegation, ownership, state agreement | L1–L2 | Active, semantics tightening |
| **Adaptation** | "How does the system observe outcomes, adjust, and evolve?" — feedback, production-autonomy boundaries, self-adaptation | L3 (in scope), L4/AGI (non-goals) | Future |

The layers are a maturity stack, not a feature list. A system cannot coordinate reliably without a stable event substrate, and cannot adapt safely without reliable coordination and governance.

## File Structure

- `docs/roadmap.md` — index/overview: the three-layer model, one status line per layer, the folded-in L0–AGI autonomy ladder, and the 0.1→1.0 release path labeled by layer. Links to the three layer files.
- `docs/roadmap/event-layer.md` — Foundation. Absorbs completed Phases 0–8 as the Event layer's achievement record. Status: stable (L0).
- `docs/roadmap/coordination-layer.md` — Active work. Delegation, handoff, escalation, cancellation propagation, state agreement, multi-agent semantics tightening (L1–L2). Ties to releases 0.2–0.4.
- `docs/roadmap/adaptation-layer.md` — Future. Feedback events, budget/audit/authorization production-autonomy boundaries, then self-adaptation, with a bounded discussion of self-evolution (L3). L4 open-ended autonomy and AGI declared explicit non-goals. Ties to releases 0.9–1.0.

## Cross-Cutting Rules

- **Naming:** prose uses **Harmovela** everywhere. Real file paths and wire identifiers (e.g., `schemas/aep-envelope.schema.json`, `AEP-C3`) stay as-is because they are actual artifacts; the naming migration is tracked as the 0.1 Transition inside the Event layer, not silently changed here.
- **Release path preserved:** the 0.1→1.0 milestones remain the delivery timeline, but each release is now annotated with the layer it advances and the autonomy level it targets.
- **Non-goals stay explicit:** L4 (open-ended long-term autonomy) and AGI (general intelligence) are stated only to bound the 1.0 promise, never scheduled.

## Non-Goals For This Rewrite

- No change to protocol behavior, delivery guarantees, or conformance claims.
- No renaming of packages, schema URIs, or wire fields.
- No new specifications — this reorganizes planning documentation only.

## Verification

Documentation-only change. Verify by reviewing internal links between the four files and confirming Harmovela naming consistency in prose (legacy identifiers appear only as real artifact paths or migration-tracked items).
