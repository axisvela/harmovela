from enum import StrEnum


class ErrorCode(StrEnum):
    PROTOCOL_ERROR = "protocol_error"
    INVALID_ENVELOPE = "invalid_envelope"
    INVALID_EVENT_TYPE = "invalid_event_type"
    UNSUPPORTED_VERSION = "unsupported_version"
    UNAUTHORIZED = "unauthorized"
    SESSION_ERROR = "session_error"
    SESSION_TIMEOUT = "session_timeout"
    SESSION_CLOSED = "session_closed"
    SUBSCRIPTION_ERROR = "subscription_error"
    SUBSCRIPTION_REJECTED = "subscription_rejected"
    TASK_ERROR = "task_error"
    TASK_TIMEOUT = "task_timeout"
    TASK_CANCELLED = "task_cancelled"
    TOOL_ERROR = "tool_error"
    TOOL_TIMEOUT = "tool_timeout"
    INTERNAL_ERROR = "internal_error"
    BUDGET_EXCEEDED = "budget_exceeded"
    INVALID_COMMAND = "invalid_command"
    INVALID_QUERY = "invalid_query"


RETRYABLE_CODES = frozenset({
    ErrorCode.SESSION_TIMEOUT,
    ErrorCode.TASK_TIMEOUT,
    ErrorCode.TOOL_TIMEOUT,
    ErrorCode.INTERNAL_ERROR,
})


def error_payload(code: str, message: str, *, retryable: bool = False, details: dict | None = None) -> dict:
    payload = {"code": code, "message": message, "retryable": retryable}
    if details:
        payload["details"] = details
    return payload


def is_retryable(code: str) -> bool:
    return code in RETRYABLE_CODES
