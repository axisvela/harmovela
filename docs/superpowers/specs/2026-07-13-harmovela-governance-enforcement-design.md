# Harmovela Governance Enforcement Design

## Goal

Add a minimal, interoperable Governance enforcement contract to all four reference implementations so identity, role-based authorization, tenant isolation, and audit linkage are conformance-testable.

## Decisions

- Use fixed minimum RBAC roles: `viewer`, `publisher`, `operator`, `tenant-admin`, and `cross-tenant-operator`.
- Use standard actions: `event.publish`, `event.subscribe`, `task.submit`, `task.manage`, `governance.audit.read`, and `tenant.cross_access`.
- Enforce default-deny tenant isolation. Actor and resource tenant must match unless the actor has `tenant.cross_access`.
- Implementations may add local roles or policy rules, but may not weaken standard allow/deny outcomes.

## Contract

Session or event context supplies `actor_id`, `tenant_id`, and `roles`. Every protected operation resolves a required action and target tenant.

| Role | Standard actions |
| --- | --- |
| `viewer` | `event.subscribe` |
| `publisher` | `event.publish`, `task.submit` |
| `operator` | `event.publish`, `event.subscribe`, `task.submit`, `task.manage` |
| `tenant-admin` | all same-tenant actions, `governance.audit.read` |
| `cross-tenant-operator` | `tenant.cross_access` plus operator actions |

Missing identity, missing required role, or disallowed tenant access returns `event.rejected` with error code `unauthorized`.

## Audit

Each authorization decision records actor, actor tenant, requested action, target resource, target tenant, decision, and available correlation/causation identifiers. Audit linkage is required for the governance conformance fixtures.

## Fixtures

Shared fixtures cover same-tenant allow, missing-role deny, cross-tenant default deny, explicit cross-tenant allow, and audit linkage. All four reference harnesses must produce equivalent acceptance or `unauthorized` rejection behavior.

## Boundaries

This is a Governance profile capability, not a Protocol release claim. It does not rename legacy identifiers or alter wire compatibility without a separate approved decision.
