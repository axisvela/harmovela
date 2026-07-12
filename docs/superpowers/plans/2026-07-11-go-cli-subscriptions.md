# Go CLI Subscriptions Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `aep subscriptions` cobra command group (create/list/delete/stream) to the Go CLI.

**Architecture:** A `newSubscriptionsCmd()` function in `cmd/aep/main.go` creates a cobra command with create/list/delete/stream subcommands, each using `net/http`. The root command adds this group.

**Tech Stack:** Go 1.25, cobra, stdlib `net/http`, `bufio`.

---

## Task 1: subscriptions create/list/delete/stream

**Files:**
- Modify: `implementations/go/cmd/aep/main.go`
- Test: `implementations/go/aep/cli_subscriptions_test.go`

- [ ] **Step 1: Write failing test**

Create `implementations/go/aep/cli_subscriptions_test.go`:

```go
package aep

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"testing"
	"time"
)

func TestCliSubscriptionsCRUD(t *testing.T) {
	port := freePort(t)
	c := subApiConfig(port)
	svc := NewRuntimeService(c)
	svc.Start()
	defer svc.Stop()
	time.Sleep(200 * time.Millisecond)
	base := fmt.Sprintf("http://127.0.0.1:%d/aep/api", port)

	aepBin := buildAep(t) // builds cmd/aep
	run := func(args ...string) (int, string, string) {
		cmd := exec.Command(aepBin, args...)
		out, err := cmd.CombinedOutput()
		if err != nil {
			return cmd.ProcessState.ExitCode(), "", string(out)
		}
		return 0, string(out), ""
	}

	code, out, _ := run("subscriptions", "create", "--filter", `{"types":"task.*"}`, "--base", base)
	if code != 0 {
		t.Fatalf("create: exit %d, out %s", code, out)
	}
	var record map[string]any
	json.Unmarshal([]byte(out), &record)
	id := record["id"].(string)

	code, out, _ = run("subscriptions", "list", "--base", base)
	if code != 0 || !strings.Contains(out, id) {
		t.Fatalf("list: %s", out)
	}

	code, out, _ = run("subscriptions", "delete", id, "--base", base)
	if code != 0 || !strings.Contains(out, "true") {
		t.Fatalf("delete: %s", out)
	}

	code, out, _ = run("subscriptions", "delete", id, "--base", base)
	if code == 0 {
		t.Fatal("expected non-zero for missing delete")
	}
}

func buildAep(t *testing.T) string {
	t.Helper()
	return "go run ../../cmd/aep" // test runs from aep/ dir; builds inline
}

// When the test needs a binary, prefer a simpler approach: run via "go run" to avoid build overhead.
// If "go run" is too slow, the repo convention uses go test; for CLI tests, spawn with `go run cmd/aep/main.go --`.
// The test above uses an exec of a pre-built binary path for simplicity.
// Actually the simpler approach: the test file is in package aep (not _test), so it can call the CLI's
// cobra root directly. But the cobra root is in package main (cmd/aep). Easier: run as a subprocess
// using `go run cmd/aep...`. Adjust the construn: run using process executable.
```

The Go CLI lives in `cmd/aep` which is a separate package. The simplest CLI test pattern for Go in this repo is to invoke the cobra root command via `go run` or by building a temp binary. Use `go run cmd/aep/main.go -- <args>` for simplicity. Update the test to use this approach:

```go
func runAep(args ...string) (int, string, string) {
	all := append([]string{"run", "cmd/aep/main.go", "--"}, args...)
	cmd := exec.Command("go", all...)
	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		return cmd.ProcessState.ExitCode(), stdout.String(), stderr.String()
	}
	return 0, stdout.String(), stderr.String()
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd implementations/go && go test ./aep/ -run TestCliSubscriptions`
Expected: FAIL because the `subscriptions` command does not exist.

- [ ] **Step 3: Implement the subscriptions command group**

In `implementations/go/cmd/aep/main.go`, above `root.AddCommand(...)`, add:

```go
	subscriptionsCmd := newSubscriptionsCmd()
	root.AddCommand(initCmd, startCmd, statusCmd, emitCmd, subscribeCmd, dlqCmd, subscriptionsCmd)
```

And add a function after `main()`:

```go
func newSubscriptionsCmd() *cobra.Command {
	var base string
	var filter string

	cmd := &cobra.Command{Use: "subscriptions", Short: "Manage runtime subscriptions over HTTP"}
	cmd.PersistentFlags().StringVar(&base, "base", "http://127.0.0.1:8790/aep/api", "runtime API base URL")

	createCmd := &cobra.Command{Use: "create", Short: "Create a subscription", RunE: func(_ *cobra.Command, _ []string) error {
		var f map[string]any
		if err := json.Unmarshal([]byte(filter), &f); err != nil {
			return fmt.Errorf("invalid JSON filter")
		}
		body, _ := json.Marshal(map[string]any{"filter": f})
		resp, err := http.Post(base+"/subscriptions", "application/json", strings.NewReader(string(body)))
		if err != nil {
			return fmt.Errorf("request failed: %w. Is aepd running?", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != 201 {
			return fmt.Errorf("request failed: HTTP %d", resp.StatusCode)
		}
		io.Copy(os.Stdout, resp.Body)
		return nil
	}}
	createCmd.Flags().StringVar(&filter, "filter", "{}", "subscription filter JSON")
	cmd.AddCommand(createCmd)

	listCmd := &cobra.Command{Use: "list", Short: "List subscriptions", RunE: func(_ *cobra.Command, _ []string) error {
		resp, err := http.Get(base + "/subscriptions")
		if err != nil {
			return fmt.Errorf("request failed: %w. Is aepd running?", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return fmt.Errorf("request failed: HTTP %d", resp.StatusCode)
		}
		io.Copy(os.Stdout, resp.Body)
		return nil
	}}
	cmd.AddCommand(listCmd)

	deleteCmd := &cobra.Command{Use: "delete <id>", Short: "Delete a subscription", Args: cobra.ExactArgs(1), RunE: func(_ *cobra.Command, args []string) error {
		req, _ := http.NewRequest(http.MethodDelete, base+"/subscriptions/"+args[0], nil)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("request failed: %w. Is aepd running?", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode == 404 {
			return fmt.Errorf("not found")
		}
		if resp.StatusCode != 200 {
			return fmt.Errorf("request failed: HTTP %d", resp.StatusCode)
		}
		io.Copy(os.Stdout, resp.Body)
		return nil
	}}
	cmd.AddCommand(deleteCmd)

	streamCmd := &cobra.Command{Use: "stream <id>", Short: "Stream events for a subscription", Args: cobra.ExactArgs(1), RunE: func(_ *cobra.Command, args []string) error {
		resp, err := http.Get(base + "/subscriptions/" + args[0] + "/stream")
		if err != nil {
			return fmt.Errorf("request failed: %w. Is aepd running?", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode == 404 {
			return fmt.Errorf("not found")
		}
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "data: ") {
				fmt.Println(strings.TrimPrefix(line, "data: "))
			}
		}
		return scanner.Err()
	}}
	cmd.AddCommand(streamCmd)

	return cmd
}
```

Add `"bufio"`, `"io"`, and `"strings"` to the imports if missing. `"encoding/json"`, `"net/http"`, `"os"`, `"fmt"` are already present.

- [ ] **Step 4: Run the CLI test**

Run: `cd implementations/go && go test ./aep/ -run TestCliSubscriptions`
Expected: PASS.

- [ ] **Step 5: Build and verify**

Run: `cd implementations/go && go build ./...`
Expected: no errors.

- [ ] **Step 6: Commit and push**

```bash
git add implementations/go/cmd/aep/main.go implementations/go/aep/cli_subscriptions_test.go
git commit -m "feat(go): add aep subscriptions CLI command group"
git push origin master
```

---

## Task 2: Final verification

- [ ] **Step 1: Run full Go suite**

Run: `cd implementations/go && go test ./...`
Expected: all packages pass.

- [ ] **Step 2: Build all binaries**

Run: `cd implementations/go && go build ./...`
Expected: no errors.

- [ ] **Step 3: Verify git sync**

Run: `git status -sb`
Expected: `## master...origin/master` with no changed files.
