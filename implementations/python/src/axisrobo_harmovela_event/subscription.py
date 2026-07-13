def subscription_matches(subscription: dict, event: dict) -> bool:
    filter_ = subscription.get("payload", subscription)

    return (
        matches_type(filter_.get("types"), event.get("type"))
        and _matches_value(filter_.get("source"), event.get("source"))
        and _matches_value(filter_.get("target"), event.get("target"))
        and _matches_value(filter_.get("topic"), event.get("topic"))
        and _matches_value(filter_.get("session_id"), event.get("session_id"))
        and _matches_value(filter_.get("conversation_id"), event.get("conversation_id"))
        and _matches_value(filter_.get("task_id"), event.get("task_id"))
    )


def matches_type(patterns, type_: str | None) -> bool:
    if patterns is None:
        return True
    if isinstance(patterns, str):
        patterns = [patterns]
    return any(_match_dotted(pattern, type_ or "") for pattern in patterns)


def _matches_value(expected, actual) -> bool:
    if expected is None:
        return True
    if isinstance(expected, str):
        expected = [expected]
    return actual in expected


def _match_dotted(pattern: str, value: str) -> bool:
    if pattern == "*" or pattern == value:
        return True
    if pattern.endswith(".*"):
        return value.startswith(pattern[:-1])

    pattern_parts = pattern.split(".")
    value_parts = value.split(".")
    if len(pattern_parts) != len(value_parts):
        return False

    return all(part == "*" or part == value for part, value in zip(pattern_parts, value_parts))
