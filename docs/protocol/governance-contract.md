# Harmovela Governance Contract

> Status: draft. Language-neutral contract boundary.

## Ownership

Governance owns identity, authorization, audit, tenant isolation, and policy/budget contracts.

The [security model](security.md) defines the existing identity, authorization, audit, and tenant-isolation behavior. Governance owns the policy and budget decision contracts that apply those concerns across dimensions without duplicating Event envelope or transport behavior.

## Public Contracts

Other dimensions consume Governance decisions through documented interfaces. Runtime ingress and egress enforce those decisions; dimensions do not import Governance internals.

The existing `harmovela.security.v1` Profile supplies the base profile. Future L3 work extends only adaptation-operation controls; it does not expand this contract into other adaptation behavior.

## Dependencies

Governance depends only on Event contracts.
