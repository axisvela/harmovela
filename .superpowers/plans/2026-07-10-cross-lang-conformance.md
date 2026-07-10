# Cross-Language Conformance Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single script that runs shared conformance fixtures across all 4 language references and produces a unified pass/fail matrix.

**Architecture:** One zero-dependency Node script that reads `conformance/manifest.json`, shells out to each language's conformance/test command via `child_process`, parses PASS/FAIL/SKIP from stdout, and prints a fixture × language table.

**Tech Stack:** Node ESM (same as TypeScript reference), `node:child_process`, `node:fs`, `node:path`. Zero new dependencies.

---

## File Structure

- Create: `tools/conformance-runner.js`
- Modify: `README.md` — add runner command

---

### Task 1: Conformance Runner Script

**Files:**
- Create: `tools/conformance-runner.js`

- [ ] **Step 1: Create the script**

Create `tools/conformance-runner.js`:

```js
#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "conformance/manifest.json"), "utf8"));

const LANGUAGES = [
  { name: "TypeScript", dir: "reference/typescript", cmd: "npm run conformance" },
  { name: "Python",     dir: "reference/python",     cmd: "python -m pytest tests/test_fixtures.py -q --tb=no" },
  { name: "Go",         dir: "reference/go",         cmd: "go test ./aep/ -run TestConformance -v" },
  { name: "Java",       dir: "reference/java",       cmd: "mvn test -pl . -Dtest=ConformanceTest -q" }
];

const results = {};

for (const lang of LANGUAGES) {
  try {
    const cwd = resolve(root, lang.dir);
    const output = execSync(lang.cmd, { cwd, timeout: 60000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    results[lang.name] = parseConformanceOutput(output, manifest.fixtures);
  } catch (err) {
    results[lang.name] = parseConformanceOutput(err.stdout ?? "", manifest.fixtures);
    if (!Object.keys(results[lang.name]).length) {
      results[lang.name] = { _error: err.message };
    }
  }
}

// Print table
const fixtures = manifest.fixtures;
const pad = (s, w) => s.padEnd(w);

const colWidth = Math.max(30, ...fixtures.map((f) => f.path.length)) + 2;
const nameWidth = 14;

// Header
process.stdout.write("\nCross-Language Conformance\n\n");
process.stdout.write(pad("Fixture", colWidth));
for (const lang of LANGUAGES) process.stdout.write(pad(lang.name, nameWidth));
process.stdout.write("\n");
process.stdout.write("-".repeat(colWidth + nameWidth * LANGUAGES.length) + "\n");

// Rows
let failed = false;
for (const fixture of fixtures) {
  process.stdout.write(pad(fixture.path, colWidth));
  for (const lang of LANGUAGES) {
    const status = results[lang.name]?._error
      ? "ERR"
      : results[lang.name]?.[fixture.path] ?? "---";
    process.stdout.write(pad(status, nameWidth));
    if (status === "FAIL") failed = true;
  }
  process.stdout.write("\n");
}
process.stdout.write("\n");

if (failed) process.exit(1);

function parseConformanceOutput(output, fixtures) {
  const map = {};
  for (const fixture of fixtures) {
    const path = fixture.path.replace("fixtures/", "");
    // Match patterns from each language's conformance output
    const passRegex = new RegExp(`(PASS|ok|passed).*${escapeRegex(path)}`, "i");
    const failRegex = new RegExp(`(FAIL|error).*${escapeRegex(path)}`, "i");
    const skipRegex = new RegExp(`(SKIP|skip).*${escapeRegex(path)}`, "i");

    if (passRegex.test(output)) map[fixture.path] = "PASS";
    else if (failRegex.test(output)) map[fixture.path] = "FAIL";
    else if (skipRegex.test(output)) map[fixture.path] = "SKIP";
  }
  return map;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
```

- [ ] **Step 2: Run from repo root**

```bash
node tools/conformance-runner.js
```

Expected: prints table with all PASS and delivery SKIP, exits 0.

- [ ] **Step 3: Commit**

```bash
git add tools/conformance-runner.js
git commit -m "feat: add cross-language conformance runner"
```

---

### Task 2: Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add conformance runner command to README**

Add after the TypeScript conformance section:

```markdown
Run cross-language conformance:

```sh
node tools/conformance-runner.js
```

This runs shared fixtures across all four language references and prints a unified pass/fail matrix.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document cross-language conformance runner"
```

---

### Task 3: Verification And Push

- [ ] **Step 1: Run the runner**

```bash
node tools/conformance-runner.js
```

- [ ] **Step 2: Push**

```bash
git status --short
git push
```
