# External L3 Pilot Report Template

> Status: Template only. Completion of this document is required evidence and does not imply that an external pilot has occurred.

## Report Identity

| Field | Value |
| --- | --- |
| Report ID | `[required]` |
| Date and timezone | `[required]` |
| Operator name and organization | `[required]` |
| Operator independence statement | `[required: operator is not a maintainer of either implementation]` |
| Report author and reviewer | `[required]` |

## Implementations And Environment

| Field | Implementation A | Implementation B |
| --- | --- | --- |
| Name | `[required]` | `[required]` |
| Version and immutable revision | `[required]` | `[required]` |
| Repository URL | `[required]` | `[required]` |
| Maintainer | `[required]` | `[required]` |
| Independence evidence | `[required]` | `[required]` |

| Configuration | Value |
| --- | --- |
| Protocol version | `v0.5.0` |
| L3 profile ID and version | `[required]` |
| Dependency profile IDs and versions | `[required]` |
| Transport profile ID and version | `[required]` |
| Topology ID and version | `[required]` |
| Wire identifiers and endpoints/routing | `[required]` |
| Fixture-suite version | `[required]` |
| Host, runtime, and toolchain versions | `[required]` |

## Fixture And Scenario Results

Provide one row per fixture or scenario. Attach immutable logs, traces, or artifacts for each result.

| Fixture/scenario ID | Feedback/outcome | Budget | Audit | Authorization | Tenant isolation | Result | Evidence URI/hash |
| --- | --- | --- | --- | --- | --- | --- |
| `[required]` | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | `[required]` |

## Observed Failures

| Failure ID | Fixture/scenario ID | Expected behavior | Observed behavior | Severity | Issue URL/status |
| --- | --- | --- | --- | --- | --- |
| `[none or required]` | `[required]` | `[required]` | `[required]` | `[required]` | `[required]` |

## Reproducibility

```sh
# Exact commands, including setup and environment variables
[required]
```

- Required inputs, fixture hashes, topology configuration, and evidence retention location: `[required]`
- Steps to reproduce any failure: `[required]`
- Clean-environment rerun result: `[required]`

## Acceptance Declaration

- All required fixture and scenario rows pass: `[yes/no]`
- Operator is independent of both implementation maintainers: `[yes/no]`
- Evidence is complete and reproducible: `[yes/no]`
- External L3 pilot acceptance: `[accepted/not accepted]`
- Reviewer signature/date: `[required]`
