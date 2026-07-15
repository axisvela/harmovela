package event

const (
	ErrorCodeProtocolError        = "protocol_error"
	ErrorCodeInvalidEnvelope      = "invalid_envelope"
	ErrorCodeInvalidEventType     = "invalid_event_type"
	ErrorCodeUnsupportedVersion   = "unsupported_version"
	ErrorCodeUnauthorized         = "unauthorized"
	ErrorCodeSessionError         = "session_error"
	ErrorCodeSessionTimeout       = "session_timeout"
	ErrorCodeSessionClosed        = "session_closed"
	ErrorCodeSubscriptionError    = "subscription_error"
	ErrorCodeSubscriptionRejected = "subscription_rejected"
	ErrorCodeTaskError            = "task_error"
	ErrorCodeTaskTimeout          = "task_timeout"
	ErrorCodeTaskCancelled        = "task_cancelled"
	ErrorCodeToolError            = "tool_error"
	ErrorCodeToolTimeout          = "tool_timeout"
	ErrorCodeInternalError        = "internal_error"
	ErrorCodeInvalidCommand       = "invalid_command"
	ErrorCodeInvalidQuery         = "invalid_query"
	ErrorCodeBudgetExceeded       = "budget_exceeded"
)

func ErrorPayload(code, message string, retryable bool) map[string]any {
	return map[string]any{
		"code":      code,
		"message":   message,
		"retryable": retryable,
		"details":   map[string]any{},
	}
}
