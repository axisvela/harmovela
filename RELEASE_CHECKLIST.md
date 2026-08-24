# v0.9.0-rc.1 Release Checklist

> Status: **Superseded by 1.0** (see `design/release/release-notes-v1.0.0.md`). This checklist records the 0.9 RC preparation state. The external-evidence gates that remained open below were exempted from 1.0 by explicit compatibility decision and deferred to 1.1.

- [x] No-new-feature freeze recorded; only permitted RC changes accepted (`design/release/rc-validation.md` freeze rules; no new protocol features added).
- [x] Full required test commands in [`design/release/rc-validation.md`](design/release/rc-validation.md) pass with retained logs. Retained logs in `conformance/rc-logs-20260817/`: TypeScript 298/298, Python 253/253, Go PASS, Java 166 PASS, conformance runner 34/34 x 4 (snapshot `conformance/rc-snapshot-20260817.txt`).
- [x] Compatibility matrix covers all required implementation, profile, transport, topology, fixture, and scenario cells (`design/release/rc-compatibility-matrix.md`, 136 rows; snapshot `conformance/rc-snapshot-20260817.txt`).
- [x] Security-response process is published (`SECURITY.md`) and rendered at `docs/site/security-response.html`. Independent validation for RC use remains pending.
- [x] Governance (`GOVERNANCE.md`), release (`RELEASES.md`), and registry (`design/protocol/event-registry-governance.md`) processes are published and rendered in `docs/site/`. Applicability review remains pending.
- [ ] External L3 pilot report is accepted using [`design/release/external-l3-pilot-template.md`](design/release/external-l3-pilot-template.md).
- [ ] Evidence for two independently maintained implementations is reviewed and accepted (fill [`design/release/independent-implementation-guide.md`](design/release/independent-implementation-guide.md) per implementation).
- [ ] No open `release-blocker` issues remain. Public tracker and release maintainer designated (`https://github.com/axisrobo/harmovela/issues`, Axisrobo team); zero blockers recorded; independent review pending.
- [x] Release notes describe RC scope, compatibility snapshot, known limitations, and evidence status ([`design/release/release-notes-v0.9.0-rc.1.md`](design/release/release-notes-v0.9.0-rc.1.md)).
