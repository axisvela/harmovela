from .subscription import matches_type


class EventRouter:
    def __init__(self):
        self._handlers: list[tuple] = []

    def on(self, patterns_or_fn, handler=None):
        if handler is None:
            self._handlers.append((lambda _: True, patterns_or_fn))
        elif callable(patterns_or_fn):
            self._handlers.append((patterns_or_fn, handler))
        else:
            patterns = [patterns_or_fn] if isinstance(patterns_or_fn, str) else patterns_or_fn
            self._handlers.append(
                (lambda event, values=patterns: any(matches_type(pattern, event.get("type")) for pattern in values), handler)
            )
        return self

    def dispatch(self, event: dict) -> list:
        results = []
        for match_fn, handler in self._handlers:
            if match_fn(event):
                response = handler(event)
                if response is not None:
                    results.extend(response if isinstance(response, list) else [response])
        return results
