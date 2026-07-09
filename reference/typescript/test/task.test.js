import assert from "node:assert/strict";
import test from "node:test";
import { TaskTracker } from "../src/index.js";

test("task full happy path: submitted -> completed", () => {
  const task = new TaskTracker({ task_id: "task_01" });

  const submitted = task.submitted();
  assert.equal(submitted.type, "task.submitted");
  assert.equal(task.state, "submitted");

  const accepted = task.accepted();
  assert.equal(accepted.type, "task.accepted");
  assert.equal(task.state, "accepted");

  const started = task.started();
  assert.equal(started.type, "task.started");
  assert.equal(task.state, "started");

  const prog = task.progress({ progress: 0.5 });
  assert.equal(prog.type, "task.progress");
  assert.equal(prog.payload.progress, 0.5);
  assert.equal(task.state, "progress");

  const out = task.output({ data: "partial" });
  assert.equal(out.type, "task.output");
  assert.equal(task.state, "output");

  const done = task.completed({ summary: "done" });
  assert.equal(done.type, "task.completed");
  assert.deepEqual(done.payload.result, { summary: "done" });
  assert.equal(task.isTerminal(), true);
});

test("task failure path", () => {
  const task = new TaskTracker({ task_id: "task_02" });
  task.submitted();
  task.accepted();
  task.started();

  const failed = task.failed("tool_timeout", "too slow", { elapsed_ms: 5000 });
  assert.equal(failed.type, "task.failed");
  assert.equal(failed.payload.error.code, "tool_timeout");
  assert.equal(task.isTerminal(), true);
});

test("task cancellation path", () => {
  const task = new TaskTracker({ task_id: "task_03" });
  task.submitted();
  task.accepted();

  const cancelled = task.cancelled("user requested cancellation");
  assert.equal(cancelled.type, "task.cancelled");
  assert.equal(cancelled.payload.reason, "user requested cancellation");
  assert.equal(task.isTerminal(), true);
});

test("task blocks and resumes", () => {
  const task = new TaskTracker({ task_id: "task_04" });
  task.submitted();
  task.accepted();
  task.started();

  const blocked = task.blocked("waiting for dependency");
  assert.equal(blocked.type, "task.blocked");
  assert.equal(task.state, "blocked");

  const resumed = task.started();
  assert.equal(resumed.type, "task.started");
  assert.equal(task.state, "started");

  task.completed();
  assert.equal(task.isTerminal(), true);
});

test("task rejects illegal transitions", () => {
  const task = new TaskTracker({ task_id: "task_05" });
  assert.throws(() => task.completed(), /illegal task transition/i);

  task.submitted();
  assert.throws(() => task.completed(), /illegal task transition/i);
});

test("task timed out event includes standard error", () => {
  const task = new TaskTracker({ task_id: "task_06" });
  task.submitted();
  task.accepted();
  task.started();

  const timedOut = task.timedOut();
  assert.equal(timedOut.type, "task.timed_out");
  assert.equal(timedOut.payload.error.code, "task_timeout");
  assert.equal(timedOut.payload.error.retryable, true);
  assert.equal(task.isTerminal(), true);
});

test("task isActive is false for submitted", () => {
  const task = new TaskTracker({ task_id: "task_07" });
  task.submitted();
  assert.equal(task.isActive(), false);

  task.accepted();
  assert.equal(task.isActive(), true);
});
