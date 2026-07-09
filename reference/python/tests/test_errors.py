from aep import ErrorCode, error_payload, is_retryable


class TestErrors:
    def test_standard_codes(self):
        assert ErrorCode.PROTOCOL_ERROR == "protocol_error"
        assert ErrorCode.INVALID_ENVELOPE == "invalid_envelope"
        assert ErrorCode.TASK_TIMEOUT == "task_timeout"
        assert ErrorCode.INTERNAL_ERROR == "internal_error"

    def test_error_payload(self):
        err = error_payload(ErrorCode.TASK_TIMEOUT, "task expired", retryable=True, details={"task_id": "task_01"})
        assert err == {"code": "task_timeout", "message": "task expired", "retryable": True, "details": {"task_id": "task_01"}}

    def test_default_not_retryable(self):
        err = error_payload(ErrorCode.PROTOCOL_ERROR, "bad message")
        assert err["retryable"] is False

    def test_is_retryable(self):
        assert is_retryable(ErrorCode.TASK_TIMEOUT) is True
        assert is_retryable(ErrorCode.INTERNAL_ERROR) is True
        assert is_retryable(ErrorCode.PROTOCOL_ERROR) is False
        assert is_retryable(ErrorCode.INVALID_ENVELOPE) is False
