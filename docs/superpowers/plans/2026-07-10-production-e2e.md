# Production End-to-End Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Add a TypeScript end-to-end example demonstrating MCP task initiation, SQLite-backed delivery tracking, retry with backoff, dead-letter handling, and AEP event correlation.

**Architecture:** Single self-contained script that creates a McpBridge with tools, wires a SqliteDeliveryStore into DeliveryTracker, runs a retry-then-dead-letter scenario followed by a happy-path completion, and prints a structured summary.

**Tech Stack:** Node ESM, existing McpBridge, SqliteDeliveryStore, DeliveryTracker, MockStdioTransport.

---

## File Structure

- Create: `reference/typescript/examples/production-e2e.js`
- Modify: `reference/typescript/package.json` — add `demo:production-e2e`
- Modify: `reference/typescript/README.md` — add demo command

---

### Task 1: Production E2E Script + Package Script

**Files:**
- Create: `reference/typescript/examples/production-e2e.js`
- Modify: `reference/typescript/package.json`

- [ ] **Step 1: Verify demo command fails before adding script**

```bash
cd reference/typescript && npm run demo:production-e2e
```

Expected: FAIL with missing script.

- [ ] **Step 2: Create the E2E script**

Create `reference/typescript/examples/production-e2e.js`. The script should:

**Act 1 – Setup:**
- Create McpBridge with two asyncToolHandler tools (crawl_url, analyze_data)
- Create SqliteDeliveryStore with `:memory:` and wire into DeliveryTracker + DeliveryJournal
- Create AepHarness with schema validation enabled
- Print setup banner

**Act 2 – Task submission (MCP → AEP):**
- Send `initialize`, `tools/list` to bridge
- Submit `crawl_url` task via MCP `tools/call` → get immediate task_id
- DeliveryTracker.track() the event
- Print "MCP returned task_id immediately, AEP lifecycle follows..."

**Act 3 – Retry demonstration:**
- Simulate consumer not acknowledging → DeliveryTracker.nack() → attempts incremented
- Call retryDelay() with increasing attempt numbers to show exponential backoff values
- After each nack, print attempt count and backoff delay
- On 3rd nack (maxed out), DeliveryTracker.deadLetter() → event moves to DLQ
- Print dead-letter event details

**Act 4 – Happy path:**
- Submit `analyze_data` task → track, ack immediately
- Consumer "processes" event → task.completed
- Print completed lifecycle

**Act 5 – Summary:**
- Print DeliveyTracker stats (total, pending, acked, deadLettered)
- Print Journal replay showing all tracked events
- Print store stats confirming SQLite durability

**Act 6 – Cleanup:**
- store.close()

The script should produce output like:
```
=== AEP Production E2E Demo ===

[Setup] SqliteDeliveryStore + DeliveryTracker + McpBridge ready

--- Retry + Dead-Letter ---
MCP tools/call → task_id=task_crawl_xxx (accepted)
[nack] attempt 1 → backoff 1000ms
[nack] attempt 2 → backoff 2000ms
[nack] attempt 3 → max attempts reached
[dead-letter] event moved to DLQ: task_crawl_xxx

--- Happy Path ---
MCP tools/call → task_id=task_analyze_xxx (accepted)
[ack] event acknowledged → task.completed

=== Store Summary ===
Pending:  0
Acked:    1
DLQ:      1

=== Journal Replay ===
[1] delivery.tracked task_crawl_xxx
[2] delivery.tracked task_analyze_xxx
```

- [ ] **Step 3: Add npm script**

In `reference/typescript/package.json`, add:
```json
"demo:production-e2e": "node ./examples/production-e2e.js"
```

- [ ] **Step 4: Run the demo**

```bash
cd reference/typescript && npm run demo:production-e2e
```

Expected: clean output showing retry → dead-letter → happy path → summary.

- [ ] **Step 5: Commit**

```bash
git add reference/typescript/examples/production-e2e.js reference/typescript/package.json
git commit -m "feat: add production end-to-end example"
```

---

### Task 2: Documentation, Verification, Push

**Files:**
- Modify: `reference/typescript/README.md`

- [ ] **Step 1: Add demo command to TypeScript README**

In `reference/typescript/README.md` examples section, add after `demo:mcp-aep-consumer`:
```sh
npm run demo:production-e2e
```

- [ ] **Step 2: Full verification**

```bash
cd reference/typescript && npm test
cd reference/typescript && npm run demo:production-e2e
node tools/conformance-runner.js
```

- [ ] **Step 3: Commit and push**

```bash
git add reference/typescript/README.md
git commit -m "docs: document production end-to-end demo"
git status --short
git push
```
