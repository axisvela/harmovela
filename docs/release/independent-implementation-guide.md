# Independent Implementation Evidence Guide

> Guide for filling the independent-maintenance evidence template in [`docs/release/rc-validation.md`](rc-validation.md). This guide explains what counts as independent maintenance and how to complete each field. It does **not** itself claim that any implementation is independently maintained; that status remains `PENDING` until evidence is recorded and reviewed.

## What "Independently Maintained" Means

For the 0.9 RC gate, two implementations must be maintained in **distinct public repositories by distinct maintainers**. The four in-repository reference implementations (TypeScript, Python, Go, Java) are **not** independent-maintenance evidence: they share one repository, one release process, and one maintainer body.

The following do **not** establish independence:

- Forking the canonical repository and changing only the name.
- Shared ownership, shared release control, or common CI that cuts both implementations.
- A repository that mirrors or vendor-copies the reference implementation without independent semantic maintenance.
- Unverified provenance: no way to confirm who maintains the repository or that the reported revision exists.

Independence is established by the **relationship evidence** in the template, not by the fact that the code runs.

## Relationship To The Compatibility Matrix

The evidence you produce must map one-to-one onto the required matrix rows in `docs/release/rc-compatibility-matrix.md`:

- Each independently maintained implementation is one implementation column.
- Each row is implementation x selected L3 profile (`harmovela.adaptation.v1`) x transport profile (`harmovela.transport.stdio.v1`) x topology (`harmovela.topology.hub-spoke.v1`) x official fixture/scenario.
- All 34 official fixtures (suite version `1.0.0`) must pass for each implementation, with per-fixture evidence.

## Field-By-Field Guidance

Complete the template once per implementation. The fields below correspond exactly to the template in `rc-validation.md`.

### Implementation name and version

- Use the exact identifier recorded in the compatibility matrix (e.g. the language/package name and its version string).
- State both the human name and the package/module version, e.g. `harmovela-java-client 0.9.0`.
- Do not reuse a reference-implementation version number to imply protocol status; implementation versions are their own axis.

### Repository URL and immutable revision

- Give the public repository URL and an immutable revision: a git commit SHA, or a tag that resolves to a fixed commit.
- A branch name alone is not immutable evidence; it moves. Use the short or full SHA recorded in the matrix.
- Confirm the URL is reachable by the validator and that the revision exists.

### Maintainer name/contact

- Identify the person or team who actually merges changes for this implementation.
- Provide a contact channel (e.g. GitHub handle, e-mail) so the release maintainer can verify.

### Maintainer relationship to other implementation(s)

- State explicitly whether the maintainer of this implementation is also a maintainer of any other participating implementation.
- If the same person/team maintains both, that is a red flag: the "two independently maintained implementations" gate is not met by two repos run by one maintainer.
- The external L3 pilot operator is a separate role and must also not be a maintainer of either implementation.

### Independent repository and maintenance evidence

- Show that this repository has its own history, its own release cadence, and changes merged by its own maintainer rather than cherry-picked from the canonical repo.
- Examples of strong evidence:
  - Distinct commit history not shared with the canonical repository.
  - Independent release tags/artifacts published by this repository.
  - A public contribution process (issues, PRs, CI) owned by this repository.
  - Divergent but semantically valid implementation decisions documented in this repository.
- Weak or insufficient evidence:
  - A fork with the reference history intact and no independent commits.
  - A release produced by the canonical CI and merely mirrored.

### Selected profile IDs and versions

- List the profiles the implementation declares, with versions. The selected L3 profile is `harmovela.adaptation.v1` (version `v1`).
- Because `harmovela.adaptation.v1` depends on `harmovela.coordination.v1` and `harmovela.security.v1`, the implementation must also declare those dependencies; record each.
- A profile version is its own axis; do not write a protocol version here.

### Transport profile and version

- Record the transport profile the matrix row uses: `harmovela.transport.stdio.v1` (version `v1`).
- If the implementation supports additional transports, that is fine, but the matrix row and per-fixture evidence must state which transport produced the result.

### Topology identifier and version

- Record the topology: `harmovela.topology.hub-spoke.v1` (version `v1`), declared in `docs/protocol/profiles.md`.
- The topology is distinct from the transport profile; both must appear in every matrix row and in the pilot report.

### Fixture/scenario suite version

- Record `1.0.0` (the suite version declared in `conformance/manifest.json`).
- If you ran a different fixture revision, the evidence does not match the snapshot and will not satisfy the gate.

### Per-fixture/scenario evidence location

- Point to retained, immutable evidence for every fixture/scenario you claim passed.
- Prefer a commit-pinned log file, an artifact hash, or a CI run URL that the validator can open.
- "Trust me, it passed" without a retrievable location is not evidence.

### Reproduction commands and environment

- Provide the exact commands from the repository root, the OS, and the runtime/toolchain versions.
- Expected command set (see `rc-validation.md`):
  - `node tools/conformance-runner.js`
  - `npm test` (TypeScript; use `node --test --test-concurrency=1` if the parallel runner hits port/resource contention)
  - `python -m pytest implementations/python/tests`
  - `cd implementations/go && go test ./...` (set `GOWORK=off` when a parent `go.work` excludes the module)
  - `mvn test -f implementations/java/pom.xml`
- If a command is unavailable in your environment, record it as `NOT RUN`, not `PASS`.

### Validator and validation date

- Name the person who ran the reproduction and confirmed the results, plus the date and timezone.
- This should be someone who can attest they actually executed the commands, not the implementation author alone.

### Open failures or release blockers

- List any fixture/scenario that failed, was skipped, or was inconclusive, with the issue URL/status.
- Zero failures is the requirement, but honest disclosure of a blocker is better than silent omission: a hidden blocker fails review and blocks promotion.

## Review Checklist For The Release Maintainer

Before accepting independent-maintenance evidence, confirm:

- [ ] Two distinct public repositories exist and are reachable.
- [ ] Each maintainer is distinct and not the maintainer of the other participating implementation.
- [ ] Independence evidence shows real, separate maintenance (history, releases, governance) rather than mirroring.
- [ ] Every required matrix cell (implementation x profile x transport x topology x 34 fixtures) has per-fixture PASS evidence.
- [ ] Transport (`harmovela.transport.stdio.v1`), topology (`harmovela.topology.hub-spoke.v1`), and fixture suite (`1.0.0`) match the snapshot.
- [ ] Reproduction commands, environment, validator, and date are recorded.
- [ ] No open `release-blocker` issues remain.

Only when both implementations pass this review is the "two independently maintained implementations" gate met.
