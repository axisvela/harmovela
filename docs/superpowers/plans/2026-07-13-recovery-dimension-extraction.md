# Recovery Dimension Extraction Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Recovery dimension (DeliveryTracker, DeliveryJournal, InMemory/Sqlite/Postgres DeliveryStores, retryDelay) from legacy `aep` namespace into independent Recovery modules across all 4 languages. Legacy aep imports Recovery as one-way adapter.

**Architecture:** Each language gets a standalone `recovery` module/package under its dimension namespace. Recovery depends only on public Event types (no dimension internals). Legacy `aep` harness/runtime imports `recovery` public APIs. Tests move alongside code.

**Tech Stack:** TypeScript (Node ESM), Python (psycopg, sqlite3), Go (pgx, modernc/sqlite), Java (JDBC, Jackson)

---

## TypeScript

### Task TS-1: Create recovery package skeleton
**Files:**
- Create: `implementations/typescript/packages/recovery/package.json`
- Create: `implementations/typescript/packages/recovery/src/index.js`
- Modify: `implementations/typescript/package.json` (add workspace + dependency)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@axisrobo/harmovela-recovery",
  "version": "0.1.0-draft",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.js"
  }
}
```

- [ ] **Step 2: Create placeholder index.js** (will be populated after source files are created)

```js
// placeholder - populated after source modules are created
```

- [ ] **Step 3: Register workspace in root package.json**

Edit `implementations/typescript/package.json` to add `"packages/recovery"` to workspaces array:
- `"workspaces": ["packages/event", "packages/governance"]` → `"workspaces": ["packages/event", "packages/governance", "packages/recovery"]`

- [ ] **Step 4: Add dependency**

Add to `implementations/typescript/package.json` dependencies:
```json
"@axisrobo/harmovela-recovery": "file:packages/recovery"
```

- [ ] **Step 5: Commit**

```bash
git add implementations/typescript/packages/recovery/ implementations/typescript/package.json
git commit -m "feat(ts): add recovery package skeleton"
```

---

### Task TS-2: Move delivery-store-memory.js to recovery package
**Files:**
- Create: `implementations/typescript/packages/recovery/src/delivery-store-memory.js`
- Modify: `implementations/typescript/packages/recovery/src/index.js`

- [ ] **Step 1: Copy file content from `src/delivery-store-memory.js` to new location**

Copy `src/delivery-store-memory.js` verbatim to `packages/recovery/src/delivery-store-memory.js`.

- [ ] **Step 2: Add export to recovery index.js**

```js
export { InMemoryDeliveryStore } from "./delivery-store-memory.js";
```

- [ ] **Step 3: Commit**

```bash
git add implementations/typescript/packages/recovery/
git commit -m "feat(ts): move InMemoryDeliveryStore to recovery package"
```

---

### Task TS-3: Move delivery-journal.js to recovery package
**Files:**
- Create: `implementations/typescript/packages/recovery/src/delivery-journal.js`
- Modify: `implementations/typescript/packages/recovery/src/index.js`

- [ ] **Step 1: Copy file content**

Copy `src/delivery-journal.js` verbatim to `packages/recovery/src/delivery-journal.js`.

- [ ] **Step 2: Add export to recovery index.js**

```js
export { DeliveryJournal } from "./delivery-journal.js";
```

- [ ] **Step 3: Commit**

```bash
git add implementations/typescript/packages/recovery/
git commit -m "feat(ts): move DeliveryJournal to recovery package"
```

---

### Task TS-4: Move delivery.js to recovery package
**Files:**
- Create: `implementations/typescript/packages/recovery/src/delivery.js`
- Modify: `implementations/typescript/packages/recovery/src/index.js`

- [ ] **Step 1: Copy and update imports**

Copy `src/delivery.js` to `packages/recovery/src/delivery.js` but update relative imports:
```js
import { InMemoryDeliveryStore } from "./delivery-store-memory.js";
import { DeliveryJournal } from "./delivery-journal.js";
```
(These paths are already correct relative to the new location)

- [ ] **Step 2: Update recovery index.js**

```js
export { DeliveryTracker, retryDelay } from "./delivery.js";
```

- [ ] **Step 3: Commit**

```bash
git add implementations/typescript/packages/recovery/
git commit -m "feat(ts): move DeliveryTracker to recovery package"
```

---

### Task TS-5: Move delivery-store-sqlite.js to recovery package
**Files:**
- Create: `implementations/typescript/packages/recovery/src/delivery-store-sqlite.js`
- Modify: `implementations/typescript/packages/recovery/src/index.js`

- [ ] **Step 1: Copy file content**

Copy `src/delivery-store-sqlite.js` to `packages/recovery/src/delivery-store-sqlite.js`.

- [ ] **Step 2: Add export to recovery index.js**

```js
export { SqliteDeliveryStore } from "./delivery-store-sqlite.js";
```

- [ ] **Step 3: Commit**

```bash
git add implementations/typescript/packages/recovery/
git commit -m "feat(ts): move SqliteDeliveryStore to recovery package"
```

---

### Task TS-6: Move delivery-store-postgres.js to recovery package
**Files:**
- Create: `implementations/typescript/packages/recovery/src/delivery-store-postgres.js`
- Modify: `implementations/typescript/packages/recovery/src/index.js`

- [ ] **Step 1: Copy file content**

Copy `src/delivery-store-postgres.js` to `packages/recovery/src/delivery-store-postgres.js`.

- [ ] **Step 2: Finalize recovery index.js** with all exports:

```js
export { DeliveryTracker, retryDelay } from "./delivery.js";
export { DeliveryJournal } from "./delivery-journal.js";
export { InMemoryDeliveryStore } from "./delivery-store-memory.js";
export { SqliteDeliveryStore } from "./delivery-store-sqlite.js";
export { PostgresDeliveryStore } from "./delivery-store-postgres.js";
```

- [ ] **Step 3: Commit**

```bash
git add implementations/typescript/packages/recovery/
git commit -m "feat(ts): move PostgresDeliveryStore to recovery package"
```

---

### Task TS-7: Update legacy aep imports to use recovery package
**Files:**
- Modify: `implementations/typescript/src/harness.js`
- Modify: `implementations/typescript/src/runtime/config.js`
- Modify: `implementations/typescript/src/index.js`
- Modify: `implementations/typescript/src/runtime/service.js`

- [ ] **Step 1: Update harness.js** - Replace `import { DeliveryTracker } from "./delivery.js";` with:
```js
import { DeliveryTracker } from "@axisrobo/harmovela-recovery";
```

- [ ] **Step 2: Update runtime/config.js** - Replace:
```js
import { InMemoryDeliveryStore } from "../delivery-store-memory.js";
import { SqliteDeliveryStore } from "../delivery-store-sqlite.js";
import { PostgresDeliveryStore } from "../delivery-store-postgres.js";
```
with:
```js
import { InMemoryDeliveryStore, SqliteDeliveryStore, PostgresDeliveryStore } from "@axisrobo/harmovela-recovery";
```

- [ ] **Step 3: Update index.js** - Replace:
```js
export { DeliveryTracker, retryDelay } from "./delivery.js";
export { InMemoryDeliveryStore } from "./delivery-store-memory.js";
export { SqliteDeliveryStore } from "./delivery-store-sqlite.js";
export { PostgresDeliveryStore } from "./delivery-store-postgres.js";
```
with:
```js
export { DeliveryTracker, retryDelay, InMemoryDeliveryStore, SqliteDeliveryStore, PostgresDeliveryStore } from "@axisrobo/harmovela-recovery";
```

- [ ] **Step 4: Run npm install** to link workspace packages

```bash
cd implementations/typescript && npm install
```

- [ ] **Step 5: Commit**

```bash
git add implementations/typescript/src/
git commit -m "feat(ts): wire legacy aep imports to recovery package"
```

---

### Task TS-8: Move and run recovery tests
**Files:**
- Move: `implementations/typescript/test/delivery.test.js` → `implementations/typescript/packages/recovery/test/delivery.test.js`
- Move: `implementations/typescript/test/delivery-journal.test.js` → `implementations/typescript/packages/recovery/test/delivery-journal.test.js`
- Move: `implementations/typescript/test/delivery-store.test.js` → `implementations/typescript/packages/recovery/test/delivery-store.test.js`
- Move: `implementations/typescript/test/delivery-store-sqlite.test.js` → `implementations/typescript/packages/recovery/test/delivery-store-sqlite.test.js`
- Move: `implementations/typescript/test/delivery-store-postgres.test.js` → `implementations/typescript/packages/recovery/test/delivery-store-postgres.test.js`

- [ ] **Step 1: Create test directory and move test files**

```bash
mkdir -p implementations/typescript/packages/recovery/test
Move-Item implementations/typescript/test/delivery.test.js implementations/typescript/packages/recovery/test/
Move-Item implementations/typescript/test/delivery-journal.test.js implementations/typescript/packages/recovery/test/
Move-Item implementations/typescript/test/delivery-store.test.js implementations/typescript/packages/recovery/test/
Move-Item implementations/typescript/test/delivery-store-sqlite.test.js implementations/typescript/packages/recovery/test/
Move-Item implementations/typescript/test/delivery-store-postgres.test.js implementations/typescript/packages/recovery/test/
```

- [ ] **Step 2: Update test imports** to use `from "@axisrobo/harmovela-recovery"` or relative `from "../src/..."` paths.

- [ ] **Step 3: Run tests**

```bash
cd implementations/typescript && node --test packages/recovery/test/delivery.test.js packages/recovery/test/delivery-journal.test.js packages/recovery/test/delivery-store.test.js
```

- [ ] **Step 4: Commit**

```bash
git add implementations/typescript/packages/recovery/test/ implementations/typescript/test/
git commit -m "feat(ts): move recovery tests to recovery package"
```

---

### Task TS-9: Run full TypeScript test suite
- [ ] **Step 1: Run all tests**

```bash
cd implementations/typescript && node --test
```

- [ ] **Step 2: Fix any import failures, commit**

---

## Python

### Task PY-1: Create recovery package directory
**Files:**
- Create: `implementations/python/src/axisrobo_harmovela_recovery/__init__.py`

- [ ] **Step 1: Create module directory and __init__.py placeholder**

```python
# axisrobo_harmovela_recovery - Harmovela Recovery dimension
```

- [ ] **Step 2: Commit**

```bash
git add implementations/python/src/axisrobo_harmovela_recovery/
git commit -m "feat(py): add recovery package skeleton"
```

---

### Task PY-2: Move recovery source files to recovery package
**Files:**
- Move: `aep/delivery_store.py` → `axisrobo_harmovela_recovery/delivery_store.py`
- Move: `aep/delivery_journal.py` → `axisrobo_harmovela_recovery/delivery_journal.py`
- Move: `aep/delivery.py` → `axisrobo_harmovela_recovery/delivery.py`
- Move: `aep/sqlite_delivery_store.py` → `axisrobo_harmovela_recovery/sqlite_delivery_store.py`
- Move: `aep/postgres_delivery_store.py` → `axisrobo_harmovela_recovery/postgres_delivery_store.py`

For each file, update internal imports from relative (`.delivery_store`) to relative within the new package (`.delivery_store` - same form, works).

Specifically in `delivery.py`, change:
```python
from .delivery_store import InMemoryDeliveryStore
```
to:
(No change needed - relative import stays correct within new package)

- [ ] **Step 1: Copy files**

For each `aep/delivery*.py`:
- Copy to `axisrobo_harmovela_recovery/` with same filename
- Update internal relative imports if they reference `aep.*` → keep as `.*`

- [ ] **Step 2: Write __init__.py** with all public exports:

```python
from .delivery import DeliveryTracker, retry_delay, DEFAULT_RETRY
from .delivery_journal import DeliveryJournal
from .delivery_store import InMemoryDeliveryStore
from .sqlite_delivery_store import SqliteDeliveryStore
from .postgres_delivery_store import PostgresDeliveryStore

__all__ = [
    "DeliveryTracker", "retry_delay", "DEFAULT_RETRY",
    "DeliveryJournal",
    "InMemoryDeliveryStore",
    "SqliteDeliveryStore",
    "PostgresDeliveryStore",
]
```

- [ ] **Step 3: Commit**

```bash
git add implementations/python/src/axisrobo_harmovela_recovery/
git commit -m "feat(py): move recovery source to recovery package"
```

---

### Task PY-3: Update legacy aep imports
**Files:**
- Modify: `implementations/python/src/aep/__init__.py`
- Modify: `implementations/python/src/aep/harness.py`
- Modify: `implementations/python/src/aep/delivery.py` (update imports to re-export from new pkg)

- [ ] **Step 1: Update aep/__init__.py** - Replace imports:
```python
from .delivery import DeliveryTracker, retry_delay, DEFAULT_RETRY
from .delivery_store import InMemoryDeliveryStore
from .delivery_journal import DeliveryJournal
from .sqlite_delivery_store import SqliteDeliveryStore
```
with:
```python
from axisrobo_harmovela_recovery import (
    DeliveryTracker, retry_delay, DEFAULT_RETRY,
    InMemoryDeliveryStore, DeliveryJournal,
    SqliteDeliveryStore, PostgresDeliveryStore,
)
```

- [ ] **Step 2: Update aep/harness.py** - Replace:
```python
from .delivery import DeliveryTracker
```
with:
```python
from axisrobo_harmovela_recovery import DeliveryTracker
```

- [ ] **Step 3: Commit**

```bash
git add implementations/python/src/aep/
git commit -m "feat(py): wire legacy aep imports to recovery package"
```

---

### Task PY-4: Move and run recovery tests
**Files:**
- Move: `tests/test_delivery.py` → `axisrobo_harmovela_recovery/tests/test_delivery.py`
- Move: `tests/test_delivery_journal.py` → `axisrobo_harmovela_recovery/tests/test_delivery_journal.py`
- Move: `tests/test_delivery_store.py` → `axisrobo_harmovela_recovery/tests/test_delivery_store.py`
- Move: `tests/test_sqlite_delivery_store.py` → `axisrobo_harmovela_recovery/tests/test_sqlite_delivery_store.py`
- Move: `tests/test_postgres_delivery_store.py` → `axisrobo_harmovela_recovery/tests/test_postgres_delivery_store.py`

- [ ] **Step 1: Create tests directory and move tests**

```bash
New-Item -ItemType Directory -Path "implementations/python/src/axisrobo_harmovela_recovery/tests"
Move-Item implementations/python/tests/test_delivery.py implementations/python/src/axisrobo_harmovela_recovery/tests/
Move-Item implementations/python/tests/test_delivery_journal.py implementations/python/src/axisrobo_harmovela_recovery/tests/
Move-Item implementations/python/tests/test_delivery_store.py implementations/python/src/axisrobo_harmovela_recovery/tests/
Move-Item implementations/python/tests/test_sqlite_delivery_store.py implementations/python/src/axisrobo_harmovela_recovery/tests/
Move-Item implementations/python/tests/test_postgres_delivery_store.py implementations/python/src/axisrobo_harmovela_recovery/tests/
```

- [ ] **Step 2: Update test imports** to use `from axisrobo_harmovela_recovery import ...`

- [ ] **Step 3: Run recovery tests**

```bash
cd implementations/python && python -m pytest src/axisrobo_harmovela_recovery/tests/ -v
```

- [ ] **Step 4: Commit**

---

### Task PY-5: Run full Python test suite
- [ ] **Step 1: Run all tests**

```bash
cd implementations/python && python -m pytest -v
```

- [ ] **Step 2: Fix any failures, commit**

---

## Go

### Task GO-1: Create recovery package
**Files:**
- Create: `implementations/go/recovery/delivery_store.go`
- Create: `implementations/go/recovery/delivery_journal.go`
- Create: `implementations/go/recovery/delivery.go`
- Create: `implementations/go/recovery/delivery_sqlite.go`
- Create: `implementations/go/recovery/delivery_postgres.go`

- [ ] **Step 1: Create recovery directory and move files**

Move each file from `aep/store/` to `recovery/`:
- `aep/store/delivery_store.go` → `recovery/delivery_store.go`
- `aep/store/delivery_journal.go` → `recovery/delivery_journal.go`
- `aep/store/delivery.go` → `recovery/delivery.go`
- `aep/store/delivery_sqlite.go` → `recovery/delivery_sqlite.go`
- `aep/store/delivery_postgres.go` → `recovery/delivery_postgres.go`

Update package declaration from `package store` to `package recovery` in all files.

- [ ] **Step 2: Commit**

```bash
git add implementations/go/recovery/ implementations/go/aep/store/
git commit -m "feat(go): create recovery package"
```

---

### Task GO-2: Update legacy aep harness imports
**Files:**
- Modify: `implementations/go/aep/harness.go`
- Modify: `implementations/go/aep/runtime/runtime.go` (if it references store)

- [ ] **Step 1: Update harness.go** - Change:
```go
"github.com/axisrobo/harmovela/aep/store"
```
to:
```go
"github.com/axisrobo/harmovela/recovery"
```

- [ ] **Step 2: Update all `store.` prefixes to `recovery.`** in harness.go and any other aep files

- [ ] **Step 3: Commit**

```bash
git add implementations/go/aep/
git commit -m "feat(go): wire legacy aep imports to recovery package"
```

---

### Task GO-3: Move and run recovery tests
**Files:**
- Move: `aep/store/delivery_test.go` → `recovery/delivery_test.go`
- Move: `aep/store/delivery_journal_test.go` → `recovery/delivery_journal_test.go`
- Move: `aep/store/delivery_store_test.go` → `recovery/delivery_store_test.go`
- Move: `aep/store/delivery_sqlite_test.go` → `recovery/delivery_sqlite_test.go`
- Move: `aep/store/delivery_postgres_test.go` → `recovery/delivery_postgres_test.go`

- [ ] **Step 1: Move tests, update package to `package recovery`**

- [ ] **Step 2: Run tests**

```bash
cd implementations/go && go test ./recovery/... -v
```

- [ ] **Step 3: Commit**

---

### Task GO-4: Run full Go test suite
- [ ] **Step 1: Run all tests**

```bash
cd implementations/go && go test ./... -v
```

- [ ] **Step 2: Fix any failures, commit**

---

## Java

### Task JV-1: Create recovery package
**Files:**
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/recovery/DeliveryStore.java`
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/recovery/InMemoryDeliveryStore.java`
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/recovery/SqliteDeliveryStore.java`
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/recovery/PostgresDeliveryStore.java`
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/recovery/DeliveryTracker.java`
- Create: `implementations/java/src/main/java/com/axisrobo/harmovela/recovery/DeliveryJournal.java`

- [ ] **Step 1: Create recovery package directory and move files**

Move from `aep/` to `harmovela/recovery/`:
- `DeliveryStore.java`, `InMemoryDeliveryStore.java`, `SqliteDeliveryStore.java`, `PostgresDeliveryStore.java`, `DeliveryTracker.java`, `DeliveryJournal.java`

Update package declarations from `package com.axisrobo.aep;` to `package com.axisrobo.harmovela.recovery;`

- [ ] **Step 2: Commit**

```bash
git add implementations/java/src/main/java/com/axisrobo/harmovela/recovery/ implementations/java/src/main/java/com/axisrobo/aep/
git commit -m "feat(java): create recovery package"
```

---

### Task JV-2: Update legacy aep imports
**Files:**
- Modify: `implementations/java/src/main/java/com/axisrobo/aep/Harness.java`

- [ ] **Step 1: Update Harness.java** - Replace:
```java
import com.axisrobo.aep.DeliveryTracker;
```
with:
```java
import com.axisrobo.harmovela.recovery.DeliveryTracker;
```

- [ ] **Step 2: Commit**

---

### Task JV-3: Move and run recovery tests
**Files:**
- Move: `src/test/java/com/axisrobo/aep/DeliveryTrackerTest.java` → `src/test/java/com/axisrobo/harmovela/recovery/DeliveryTrackerTest.java`
- Move: `src/test/java/com/axisrobo/aep/DeliveryJournalTest.java` → `src/test/java/com/axisrobo/harmovela/recovery/DeliveryJournalTest.java`
- Move: `src/test/java/com/axisrobo/aep/InMemoryDeliveryStoreTest.java` → `src/test/java/com/axisrobo/harmovela/recovery/InMemoryDeliveryStoreTest.java`
- Move: `src/test/java/com/axisrobo/aep/PostgresDeliveryStoreTest.java` → `src/test/java/com/axisrobo/harmovela/recovery/PostgresDeliveryStoreTest.java`
- Move: `src/test/java/com/axisrobo/aep/SqliteDeliveryStoreTest.java` → `src/test/java/com/axisrobo/harmovela/recovery/SqliteDeliveryStoreTest.java`

- [ ] **Step 1: Move test files, update package declarations**

- [ ] **Step 2: Run tests**

```bash
cd implementations/java && mvn test -pl . -Dtest="com.axisrobo.harmovela.recovery.*"
```

- [ ] **Step 3: Commit**

---

### Task JV-4: Run full Java test suite
- [ ] **Step 1: Run all tests**

```bash
cd implementations/java && mvn test
```

- [ ] **Step 2: Fix any failures, commit**

---

## Final Verification

### Task FINAL-1: Run all language test suites
- [ ] **Step 1: TypeScript**

```bash
cd implementations/typescript && node --test
```

- [ ] **Step 2: Python**

```bash
cd implementations/python && python -m pytest -v
```

- [ ] **Step 3: Go**

```bash
cd implementations/go && go test ./... -v
```

- [ ] **Step 4: Java**

```bash
cd implementations/java && mvn test
```

- [ ] **Step 5: Report hash + test results / blockers**
