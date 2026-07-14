export const ErrorCode = Object.freeze({
  PROTOCOL_ERROR: "protocol_error",
  INVALID_ENVELOPE: "invalid_envelope",
  INVALID_EVENT_TYPE: "invalid_event_type",
  UNSUPPORTED_VERSION: "unsupported_version",
  UNAUTHORIZED: "unauthorized",
  SESSION_ERROR: "session_error",
  SESSION_TIMEOUT: "session_timeout",
  SESSION_CLOSED: "session_closed",
  SUBSCRIPTION_ERROR: "subscription_error",
  SUBSCRIPTION_REJECTED: "subscription_rejected",
  TASK_ERROR: "task_error",
  TASK_TIMEOUT: "task_timeout",
  TASK_CANCELLED: "task_cancelled",
  TOOL_ERROR: "tool_error",
  TOOL_TIMEOUT: "tool_timeout",
  INTERNAL_ERROR: "internal_error",
  BUDGET_EXCEEDED: "budget_exceeded"
});

export function errorPayload(code, message, { retryable = false, details = {} } = {}) {
  return { code, message, retryable, details };
}

export function isRetryableCode(code) {
  return code === ErrorCode.SESSION_TIMEOUT
    || code === ErrorCode.TASK_TIMEOUT
    || code === ErrorCode.TOOL_TIMEOUT
    || code === ErrorCode.INTERNAL_ERROR;
}
