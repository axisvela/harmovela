# Harmovela Migration Compatibility Matrix

> Status: decision input for the Harmovela migration milestone. This matrix is not a Protocol, Profile, or Implementation release claim.

## Purpose

This matrix inventories public legacy `aep` surfaces that require an explicit compatibility decision before they may be renamed, removed, or assigned a replacement. It does not itself authorize a rename. Historical documents are not evidence for future version gates or compatibility decisions.

## Version Axes

- Protocol: Harmovela specification and wire compatibility.
- Profile: independently negotiated capability contracts.
- Implementation: language package, daemon, and CLI artifacts.
- Milestone: project delivery state only.

The affected axis for this document is Milestone. The matrix records inputs for Protocol, Profile, and Implementation decisions without inferring a release or compatibility outcome for any of them.

## Inventory Method

The following planned search was run across the shared schemas, fixtures, implementations, protocol documents, and top-level readmes. Matching documentation, source, tests, generated code, and build artifacts are consolidated below by their public consumer contract; internal repetitions do not create separate public surfaces.

```powershell
rg -n "\baep\b|AEPD_|AEP_|aep_version|/aep|aep-0\.|@axisrobo/aep|com\.axisrobo\.aep" schemas conformance implementations docs/protocol README.md README_zh.md
```

| Surface | Axis | Current identifier | Consumer scope | Replacement decision | Compatibility behavior | Decision authority |
| --- | --- | --- | --- | --- | --- | --- |
| Envelope schema assets | Protocol | `schemas/aep-envelope.schema.json`, `schemas/aep-payloads.schema.json`, and `https://schemas.axisrobo.com/aep-payloads.v0.1.schema.json` | Schema consumers and all conformance implementations | Pending explicit compatibility decision | Preserve current schema filenames and `$id` values | Protocol compatibility decision |
| Envelope version field | Protocol | `spec_version` in schemas, fixtures, and implementations; `aep_version` in versioning prose and legacy examples | Wire peers, fixture consumers, and all implementations | Blocked; see Blocking Decisions | Accept only behavior already defined by each current contract; do not add aliases | Protocol compatibility decision |
| Session protocol identity | Protocol | `protocol: "aep"` and `capabilities.aep_version` | Session peers and capability negotiation consumers | Pending explicit compatibility decision | Preserve current serialized values | Protocol compatibility decision |
| WebSocket endpoint and subprotocol | Protocol | `/aep`, `aep-0.1` | WebSocket clients, servers, and proxies | Pending explicit compatibility decision | Preserve current path and subprotocol | Protocol compatibility decision |
| HTTP SSE endpoint | Protocol | `/aep/events` | SSE publishers and subscribers | Pending explicit compatibility decision | Preserve current endpoint | Protocol compatibility decision |
| gRPC service and metadata | Protocol | `/aep.v1.AepTransport/Stream`, `aep-session-id`, `aep-version`, `aep-agent-id`, `x-aep-cursor` | gRPC clients, servers, and intermediaries | Pending explicit compatibility decision | Preserve current service path and metadata keys | Protocol compatibility decision |
| NATS routing names | Profile | `aep` subject prefix, including `aep.type.*`, `aep.sess.*`, and `aep.>` | NATS publishers and subscribers | Pending transport-profile decision | Preserve current default prefix and subjects | Relevant transport Profile decision |
| Kafka routing names | Profile | `aep.events`, `aep` topic prefix, and `aep-*` headers | Kafka producers and consumers | Pending transport-profile decision | Preserve current topics, prefix, and headers | Relevant transport Profile decision |
| Redis Stream routing names | Profile | `aep.events`, `aep` stream prefix, `aep-*` fields, `aep-sess_*`, and `aep-default` groups | Redis Stream producers and consumers | Pending transport-profile decision | Preserve current streams, fields, and consumer groups | Relevant transport Profile decision |
| TypeScript package and command surfaces | Implementation | `@axisrobo/aep`, `aep`, `aep-harness`, `aepd`, `aep.config.json`, `AEP_CONFIG`, and `AEPD_*`/`AEP_POSTGRES_URL` | npm consumers, CLI users, daemon operators, and configuration automation | Pending implementation migration plan | Preserve current package, command, file, and environment names | TypeScript implementation decision |
| Python package and command surfaces | Implementation | distribution `aep-reference-python`, module `aep`, commands `aep` and `aepd`, `aep.config.json`, and `AEPD_*`/`AEP_POSTGRES_URL` | PyPI consumers, importers, CLI users, and daemon operators | Pending implementation migration plan | Preserve current distribution, import, command, file, and environment names | Python implementation decision |
| Go package and command surfaces | Implementation | `github.com/axisrobo/harmovela/aep`, `./aep`, commands `aep` and `aepd`, `.aep/aep.sqlite`, and `AEPD_*`/`AEP_POSTGRES_URL` | Go importers, CLI users, daemon operators, and persisted local runtime state | Pending implementation migration plan | Preserve current import path, commands, state path, and environment names | Go implementation decision |
| Java package and command surfaces | Implementation | `com.axisrobo.aep`, CLI command `aep`, `aep.config.json`, and `AEPD_*`/`AEP_POSTGRES_URL` | Java importers, CLI users, daemon operators, and configuration automation | Pending implementation migration plan | Preserve current package, command, file, and environment names | Java implementation decision |
| Runtime HTTP API default | Implementation | `/aep/api` | Runtime API clients, CLI subscription commands, and automation | Pending implementation migration plan | Preserve current API base path | Per-language implementation decision |
| MCP bridge identity | Implementation | `aep-mcp-bridge` and `mcp-aep-consumer` | MCP bridge users and example consumers | Pending implementation migration plan | Preserve current bridge identifiers | Per-language implementation decision |
| Migration matrix status | Milestone | This compatibility matrix | Project planning and extraction-gate reviewers | No replacement; decision input only | No Protocol, Profile, or Implementation release is implied | Milestone owner with recorded acceptance evidence |

## Blocking Decisions

| Decision | Conflicting current sources | Required resolution evidence |
| --- | --- | --- |
| Envelope version field | `spec_version` schema/implementations vs. `aep_version` versioning prose | Approved Protocol compatibility decision and positive/negative fixtures |
| Unknown event handling | versioning opaque-forwarding rule vs. registry validators rejecting unknown types | Approved Event contract and cross-language fixture results |
| Runtime naming surfaces | Harmovela runtime defaults vs. legacy commands, paths, environment variables, and subprotocols | Approved breaking-release migration table |

No blocking decision is resolved by this milestone record. In particular, this inventory does not authorize wire, package, CLI, endpoint, environment-variable, schema, or transport-subprotocol renames.
