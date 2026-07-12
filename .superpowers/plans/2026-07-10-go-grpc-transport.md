# Go gRPC Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Add gRPC bidirectional streaming transport to Go, completing transport parity for 3 languages (TS, Python, Go).

**Architecture:** Copy the shared `aep.proto`, generate Go gRPC code, implement server + client transports as standalone structs following existing Go patterns. One source file + one test file.

**Tech Stack:** Go 1.21+, `google.golang.org/grpc`, `google.golang.org/protobuf`.

---

## File Structure

- Create: `implementations/go/aep/aep.proto` â€?copy of shared proto
- Create: `implementations/go/aep/aep.pb.go` â€?generated (or generate at build time)
- Create: `implementations/go/aep/aep_grpc.pb.go` â€?generated
- Create: `implementations/go/aep/transport_grpc.go` â€?GrpcServer + GrpcClient
- Create: `implementations/go/aep/transport_grpc_test.go` â€?integration tests
- Modify: `implementations/go/go.mod` â€?add grpc deps
- Modify: `implementations/go/README.md` â€?add gRPC to scope

---

### Task 1: Proto + gRPC Implementation + Tests

**Files:** proto, generated code, transport_grpc.go, transport_grpc_test.go, go.mod

- [ ] Add `google.golang.org/grpc` to go.mod, run `go mod tidy`
- [ ] Copy `aep.proto` from `implementations/typescript/src/transport/` to `implementations/go/aep/`
- [ ] Generate Go code: `protoc --go_out=. --go-grpc_out=. aep.proto` (or embed generated code)
- [ ] TDD: Write 4 tests (server start, exchange, bidirectional, shutdown)
- [ ] Implement `GrpcServer` + `GrpcClient` with `Start()/Stop()/Send()/Receive()` methods
- [ ] Run `cd implementations/go && go test ./aep/ -v` â€?56 tests pass
- [ ] Commit: `feat: add Go gRPC transport`

### Task 2: Docs, Verify, Push

- [ ] Update `implementations/go/README.md` â€?add gRPC transport to scope
- [ ] Run cross-language conformance: `node tools/conformance-runner.js`
- [ ] Push
