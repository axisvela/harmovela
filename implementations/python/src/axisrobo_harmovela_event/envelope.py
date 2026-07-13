from datetime import datetime

DELIVERY_MODES = frozenset({"best_effort", "at_least_once", "replayable"})


def validate_envelope(value: dict) -> list[str]:
    errors: list[str] = []

    if not isinstance(value, dict):
        return ["event must be a JSON object"]

    for field in ("spec_version", "id", "type", "source", "created_at"):
        _require_string(value, field, errors)

    if "payload" not in value:
        errors.append("payload is required")

    created_at = value.get("created_at")
    if isinstance(created_at, str):
        try:
            datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except ValueError:
            errors.append("created_at must be an ISO-compatible timestamp")

    if "delivery" in value:
        _validate_delivery(value["delivery"], errors)

    if value.get("type") == "subscription.requested":
        _validate_subscription_payload(value.get("payload"), errors)

    return errors


def _require_string(value: dict, field: str, errors: list[str]) -> None:
    val = value.get(field)
    if not isinstance(val, str) or len(val) == 0:
        errors.append(f"{field} must be a non-empty string")


def _validate_delivery(delivery: dict, errors: list[str]) -> None:
    if not isinstance(delivery, dict):
        errors.append("delivery must be an object when present")
        return
    mode = delivery.get("mode")
    if mode is not None and mode not in DELIVERY_MODES:
        expected = ", ".join(sorted(DELIVERY_MODES))
        errors.append(f"delivery.mode must be one of: {expected}")


def _validate_subscription_payload(payload, errors: list[str]) -> None:
    if not isinstance(payload, dict):
        errors.append("subscription.requested payload must be an object")
        return

    if "types" in payload and not _is_string_or_array(payload["types"]):
        errors.append("subscription payload types must be a string or string array")

    for field in ("source", "target", "topic", "session_id", "conversation_id", "task_id"):
        val = payload.get(field)
        if val is not None and not _is_string_or_array(val):
            errors.append(f"subscription payload {field} must be a string or string array")


def _is_string_or_array(value) -> bool:
    return isinstance(value, str) or (
        isinstance(value, list) and all(isinstance(item, str) for item in value)
    )
