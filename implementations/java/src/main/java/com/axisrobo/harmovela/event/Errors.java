package com.axisrobo.harmovela.event;

import java.util.Map;

public final class Errors {
    private Errors() {}

    public static final String PROTOCOL_ERROR = "protocol_error";
    public static final String INVALID_ENVELOPE = "invalid_envelope";
    public static final String INVALID_EVENT_TYPE = "invalid_event_type";
    public static final String UNSUPPORTED_VERSION = "unsupported_version";
    public static final String UNAUTHORIZED = "unauthorized";
    public static final String SESSION_ERROR = "session_error";
    public static final String SESSION_TIMEOUT = "session_timeout";
    public static final String SESSION_CLOSED = "session_closed";
    public static final String SUBSCRIPTION_ERROR = "subscription_error";
    public static final String SUBSCRIPTION_REJECTED = "subscription_rejected";
    public static final String TASK_ERROR = "task_error";
    public static final String TASK_TIMEOUT = "task_timeout";
    public static final String TASK_CANCELLED = "task_cancelled";
    public static final String TOOL_ERROR = "tool_error";
    public static final String TOOL_TIMEOUT = "tool_timeout";
    public static final String INTERNAL_ERROR = "internal_error";

    public static Map<String, Object> errorPayload(String code, String message, boolean retryable) {
        return Map.of(
            "code", code,
            "message", message,
            "retryable", retryable,
            "details", Map.of()
        );
    }
}
