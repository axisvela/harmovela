import assert from "node:assert/strict";
import test from "node:test";
import { ErrorCode, errorPayload, isRetryableCode } from "../src/index.js";

test("standard error codes are defined", () => {
  assert.equal(ErrorCode.PROTOCOL_ERROR, "protocol_error");
  assert.equal(ErrorCode.INVALID_ENVELOPE, "invalid_envelope");
  assert.equal(ErrorCode.TASK_TIMEOUT, "task_timeout");
  assert.equal(ErrorCode.INTERNAL_ERROR, "internal_error");
});

test("errorPayload produces standard error body", () => {
  const err = errorPayload(ErrorCode.TASK_TIMEOUT, "task expired", { retryable: true, details: { task_id: "task_01" } });
  assert.deepEqual(err, {
    code: "task_timeout",
    message: "task expired",
    retryable: true,
    details: { task_id: "task_01" }
  });
});

test("errorPayload defaults retryable to false", () => {
  const err = errorPayload(ErrorCode.PROTOCOL_ERROR, "bad message");
  assert.equal(err.retryable, false);
});

test("isRetryableCode identifies retryable errors", () => {
  assert.equal(isRetryableCode(ErrorCode.TASK_TIMEOUT), true);
  assert.equal(isRetryableCode(ErrorCode.INTERNAL_ERROR), true);
  assert.equal(isRetryableCode(ErrorCode.PROTOCOL_ERROR), false);
  assert.equal(isRetryableCode(ErrorCode.INVALID_ENVELOPE), false);
});
