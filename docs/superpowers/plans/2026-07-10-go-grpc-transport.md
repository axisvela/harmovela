# Go gRPC Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Add gRPC bidirectional streaming transport to Go, completing transport parity for 3 languages (TS, Python, Go).

**Architecture:** Copy the shared `aep.proto`, generate Go gRPC code, implement server + client transports as standalone structs following existing Go patterns. One source file + one test file.

**Tech Stack:** Go 1.21+, `google.golang.org/grpc`, `google.golang.org/protobuf`.

---

## File Structure

- Create: `reference/go/aep/aep.proto` — copy of shared proto
- Create: `reference/go/aep/aep.pb.go` — generated (or generate at build time)
- Create: `reference/go/aep/aep_grpc.pb.go` — generated
- Create: `reference/go/aep/transport_grpc.go` — GrpcServer + GrpcClient
- Create: `reference/go/aep/transport_grpc_test.go` — integration tests
- Modify: `reference/go/go.mod` — add grpc deps
- Modify: `reference/go/README.md` — add gRPC to scope

---

### Task 1: Proto + gRPC Implementation + Tests

**Files:** proto, generated code, transport_grpc.go, transport_grpc_test.go, go.mod

- [ ] Add `google.golang.org/grpc` to go.mod, run `go mod tidy`
- [ ] Copy `aep.proto` from `reference/typescript/src/transport/` to `reference/go/aep/`
- [ ] Generate Go code: `protoc --go_out=. --go-grpc_out=. aep.proto` (or embed generated code)
- [ ] TDD: Write 4 tests (server start, exchange, bidirectional, shutdown)
- [ ] Implement `GrpcServer` + `GrpcClient` with `Start()/Stop()/Send()/Receive()` methods
- [ ] Run `cd reference/go && go test ./aep/ -v` — 56 tests pass
- [ ] Commit: `feat: add Go gRPC transport`

### Task 2: Docs, Verify, Push

- [ ] Update `reference/go/README.md` — add gRPC transport to scope
- [ ] Run cross-language conformance: `node tools/conformance-runner.js`
- [ ] Push
