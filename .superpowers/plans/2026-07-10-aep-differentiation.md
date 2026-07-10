# AEP Differentiation Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document AEP's precise relationship to established event systems and MCP without overstating established messaging mechanisms as protocol novelty.

**Architecture:** Add one positioning document that separates transport, generic event envelope, and agent-semantic responsibilities. Link it from the repository index and generated specification site; strengthen the MCP relationship document with the sync/async boundary and a concrete lifecycle example.

**Tech Stack:** Markdown, Node.js static-site generator, repository link checks.

---

### Task 1: Add the Differentiation Document

**Files:**
- Create: `docs/differentiation.md`

- [ ] **Step 1: Write the comparison scope and honest baseline**

Add sections that state CloudEvents, AsyncAPI, brokers, actor runtimes, and event sourcing provide useful existing building blocks. State explicitly that AEP does not claim a new generic envelope, broker, delivery algorithm, or transport.

- [ ] **Step 2: Specify agent-level semantics and comparison tables**

Add tables comparing AEP with CloudEvents, AsyncAPI, Kafka/NATS/Redis Streams, actor systems, event sourcing, and MCP. Cover session/conversation/task correlation, task lifecycle validation, context and memory invalidation, causation, subscription filtering, replay, and synchronous capability calls.

- [ ] **Step 3: Describe composition boundaries and limitations**

Document the intended layering: a broker transports AEP; CloudEvents-compatible mappings are possible; AsyncAPI can describe bindings; MCP remains the synchronous call layer. Mark belief revision, delegation, provenance, freshness, and interruption as areas requiring further specification rather than claims of current protocol guarantees.

### Task 2: Integrate the Positioning With Existing Documents

**Files:**
- Modify: `docs/mcp-relationship.md`
- Modify: `docs/architecture.md`
- Modify: `README.md`

- [ ] **Step 1: Clarify MCP's non-substitutability**

Add a lifecycle example to `docs/mcp-relationship.md` that distinguishes acceptance from completion and identifies replay, cancellation, and producer-driven external state change as the reasons HTTPS request-response alone is insufficient.

- [ ] **Step 2: Clarify architectural placement**

Add a short `What AEP Adds` section to `docs/architecture.md` that distinguishes generic event infrastructure from AEP's standardized agent semantics.

- [ ] **Step 3: Link the differentiation document**

Add `docs/differentiation.md` to the README document index with a description that it is a positioning and comparison document, not a normative specification.

### Task 3: Publish and Verify the Documentation

**Files:**
- Modify: `tools/generate-spec-site.js`
- Regenerate: `docs/*.html`

- [ ] **Step 1: Include the new design document in generated site input**

Extend the `docFiles` list in `tools/generate-spec-site.js` with `differentiation.md` so it appears in the design document index.

- [ ] **Step 2: Generate the static site**

Run: `node tools/generate-spec-site.js`

Expected: output reports `Site generated: D:\profile\paper-code\Axisrobo-AEP\docs`.

- [ ] **Step 3: Verify documentation links and terminology**

Run: `node --check tools/generate-spec-site.js`

Run: `git diff --check`

Expected: both commands exit with code 0. Manually confirm that `README.md`, `docs/architecture.md`, and `docs/mcp-relationship.md` link or refer to `docs/differentiation.md` consistently.

## Review

- Coverage: the new document covers the requested comparison set, identifies non-novel building blocks, names the three-level correlation model and invalidation semantics, and limits claims to behavior already documented by AEP specs.
- Placeholder scan: no implementation placeholders remain.
- Terminology: uses the existing `session_id`, `conversation_id`, `task_id`, `correlation_id`, and `causation_id` spellings consistently.
