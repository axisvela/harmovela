# Capability Contract Schema Design

**Date**: 2026-07-14
**Status**: Draft
**Scope**: Add `schemas/capability-contract.schema.json` to the Harmovela project as a standalone registry schema.

## Motivation

Current Skill-centric architecture lacks formal capability semantics. Skills are discovered via fragile description-matching, composed without type safety, and lack governance contracts. The Capability Contract schema formalizes what a Capability is — replacing SKILL.md as the primary abstraction with a typed, governed, contract that can be:

1. Stored in MNEME's capability registry with git-like version tracking
2. Matched structurally by ORCHID O-0 (not just embedding similarity)
3. Validated at CAP-C0 through CAP-C4 conformance levels
4. Governed by Archon Guard risk classification and capability tokens

## Design Decisions

### Integration Model

Standalone registry schema only. The contract defines the shape of a Capability definition stored in MNEME's registry. It is NOT tied to Harmovela event payload validation in this pass. Future passes may add `capability.registered` / `capability.composed` / `capability.validated` event payloads to `harmovela-payloads.schema.json`.

### Namespace Format

Dotted hierarchical, matching Harmovela's existing event type regex: `^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$`. Example: `engineering.quality.code-review`.

### Required Fields

Moderate strictness. Required top-level: `id`, `version`, `signature` (with `inputs`, `outputs`, `preconditions`, `postconditions`), `permissions` (with `scope`), `governance` (with `risk`), `freshness` (with `valid_from`), `implementations` (min 1 item). Conformance and enterprise architecture attributes are optional.

## Routing Model

The routing chain has exactly **two hops**. Skill is not a separate routing layer — it is embedded content within the Capability contract.

```
Intent (user natural language)
  │
  ▼
┌────────────────────────────────┐
│  Hop 1: ORCHID O-0             │  Intent → Capability
│  Structured + semantic match   │  (one matching decision)
└──────────┬─────────────────────┘
           │ capability.id resolved
           ▼
┌────────────────────────────────┐
│  Capability Contract (MNEME)   │
│  selector evaluates context    │  ← built into the contract itself
│  → picks an implementation     │     NOT a separate routing layer
└──────────┬─────────────────────┘
           │ implementation.type
           ▼
┌────────────────────────────────┐
│  Hop 2: Execution Engine       │
│  skill   → AXON Core (LLM)     │
│  workflow→ AXIS-Process        │
│  script  → Vulcan Forge        │
│  mcp     → Janus Gateway       │
│  api     → direct HTTP call    │
│  service → service mesh        │
└────────────────────────────────┘
```

Key: Skill is absorbed into `implementations[].type: "skill"`. The routing layer never knows Skill exists. ORCHID matches Intent → Capability. The Capability's own `selector` picks which implementation profile to use based on execution context (environment, permissions, resource availability, risk preference).

## Schema Structure

```
CapabilityContract
├── $schema / $id / title / description
├── id              (string, dotted namespace)
├── version         (string, semver)
├── display_name    (string)
├── description     (string)
├── tags            (string[])
├── signature       (typed input/output + pre/post conditions + effects)
├── permissions     (scope booleans + network/fs/runtime bounds)
├── governance      (risk + approval + owner)
├── freshness       (valid_from + valid_until + stale_after)
├── enterprise      (business_domain + regions + capabilities + apqc + compliance)
├── selector        (implementation selection rules)
├── implementations (skill|script|workflow|mcp|api|service array)
└── conformance     (level + golden/adversarial cases + benchmark)
```

## Conformance Levels

| Level | Name | Content |
|-------|------|---------|
| CAP-C0 | Schema conformance | Contract passes JSON Schema validation |
| CAP-C1 | Behavioral conformance | Golden cases pass against capability |
| CAP-C2 | Adversarial conformance | Malformed/attack inputs rejected |
| CAP-C3 | Composition conformance | Invariants hold across composed capabilities |
| CAP-C4 | Governance conformance | Permissions/audit/recovery integrity |

## Relationship to Existing Projects

| Project | Role |
|---------|------|
| Harmovela (this repo) | Schema definition, conformance fixtures |
| MNEME | Capability registry storage, hybrid search, version tracking |
| ORCHID | Hop 1: Intent → Capability matching (O-0 delegation criteria) |
| AXON Core / Vulcan / Janus | Hop 2: Execute the selected implementation profile |
| Archon Guard (EE) | Risk classification L0-L5, capability token issuance |
| EASEF | Dual-identity IAM, scope enforcement, token revocation |
| Vulcan Forge | Sandbox enforcement for capability implementations |
| APEX | Conformance fixtures and integration experiments |

## Integration Points

The schema is loadable as a Harmovela conformance manifest. Future event types may carry the contract as an event payload for runtime updates. The `implementations` array maps each Capability to its concrete realization (Skill prompt, script, workflow, MCP server, API endpoint, or service).

## Implementation Selector

The `selector` field is embedded in the Capability contract, not in a separate routing layer. It chooses which `implementations[]` entry to execute based on execution context.

The selector is a simple priority-ordered rule set:

```json
"selector": {
  "strategy": "priority" | "context_match" | "first_available",
  "rules": [
    {
      "prefer": "script",
      "when": { "sandbox": "docker" }
    },
    {
      "prefer": "skill",
      "when": { "sandbox": "none" }
    }
  ],
  "default": "skill"
}
```

- **priority**: Always picks the highest-priority match
- **context_match**: Evaluates `when` conditions against runtime context (sandbox type, network availability, permissions, model type)
- **first_available**: Picks the first implementation whose runtime is reachable

## Implementation Resolution

`implementations[].path` is a logical artifact reference, not a physical runtime address. The two concerns have different lifecycles and different owners:

| Information | Lifecycle | Owner |
|-------------|-----------|-------|
| Artifact reference (`path`, `locator`) | Changes with the contract version | Capability Contract (MNEME registry) |
| Execution endpoint (where AXON Core / Vulcan Forge / Janus Gateway actually run) | Changes with deployment, environment, region | Hop 2 execution engine registry (deployment configuration) |

Physical endpoints deliberately stay out of the contract. Embedding a concrete address would couple a portable, versioned, governed definition to a specific deployment, forcing a contract version bump on every infrastructure change.

The resolution chain at execution time:

1. `selector` picks an `implementations[]` entry (by `type`).
2. The Hop 2 execution engine registry — deployment configuration, one per environment — maps `type` + `runtime` (and optionally `endpoint_ref`) to the actual engine endpoint.
3. The selected engine interprets `path` within its own artifact namespace, or dereferences `locator` when present.

Two optional fields support this without breaking the layering:

- `locator`: an artifact locator URI (`file://`, `git+https://`, `oci://`, `mcp://`, `https://`) pinning where the artifact lives when engine-relative `path` resolution is not enough.
- `endpoint_ref`: a logical key into the deployment configuration's endpoint bindings. It names a binding; it is never itself a physical address.

## Example Instance

```json
{
  "id": "engineering.quality.code-review",
  "version": "1.2.0",
  "display_name": "Code Review",
  "description": "Review code changes for quality, security, and style compliance",
  "tags": ["quality", "security", "automation"],
  "signature": {
    "inputs": {
      "repository": { "type": "RepositorySnapshot", "schema": "contracts/types/repo-snapshot.schema.json" }
    },
    "outputs": {
      "report": { "type": "ReviewReport", "schema": "contracts/types/review-report.schema.json" }
    },
    "preconditions": ["repo_indexed", "diff_isolated"],
    "postconditions": ["review_logged", "findings_tagged"],
    "effects": ["may_read_source", "may_write_comments"],
    "idempotency": "idempotent_with_freshness(5m)",
    "recovery": {
      "compensation": "delete_review_comments",
      "rollback": "restore_branch_head"
    }
  },
  "permissions": {
    "scope": { "repo:read": true, "repo:write:comments": true },
    "network": "allowlisted",
    "filesystem": "read_only"
  },
  "governance": {
    "risk": "medium",
    "approval": { "production": "auto", "staging": "none" }
  },
  "freshness": {
    "valid_from": "2026-01-01T00:00:00Z",
    "stale_after": "P180D"
  },
  "enterprise": {
    "business_domain": ["Engineering", "Quality"],
    "regions": ["global"],
    "apqc_processes": [
      { "category_id": "8.2.1", "process_name": "Perform quality assurance", "level": 3 }
    ]
  },
  "selector": {
    "strategy": "priority",
    "rules": [
      { "prefer": "script", "when": { "sandbox": "docker", "model": "local" } }
    ],
    "default": "skill"
  },
  "implementations": [
    {
      "type": "skill",
      "path": "skills/code-review/SKILL.md",
      "locator": "git+https://github.com/axisrobo/harmovela.git#skills/code-review/SKILL.md",
      "runtime": "node",
      "description": "LLM-based review using code-review SKILL.md prompt"
    },
    {
      "type": "script",
      "path": "scripts/review.py",
      "endpoint_ref": "vulcan-forge.default",
      "runtime": "python",
      "description": "Deterministic lint-based review script"
    }
  ],
  "conformance": {
    "level": "CAP-C1",
    "golden_cases": ["fixtures/review-golden.jsonl"],
    "adversarial_cases": ["fixtures/review-adversarial.jsonl"]
  }
}
```

## File Path

`schemas/capability-contract.schema.json`
