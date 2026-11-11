from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from axisvela_harmovela_event import validate_envelope

DEFAULT_BASE_URL = "http://127.0.0.1:8790"
DEFAULT_PATH = "/harmovela/api"


class HarmovelaClientError(Exception):
    """Raised when the Harmovela API returns an error."""

    def __init__(self, message: str, status: int = 0, body: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.body = body


class HarmovelaClient:
    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        path: str = DEFAULT_PATH,
        timeout: float = 30.0,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.path = _normalize_path(path)
        self.timeout = timeout
        self.headers = dict(headers or {})

    def health(self) -> dict[str, Any]:
        return self.request("GET", "/healthz")

    def publish(self, event: dict[str, Any]) -> dict[str, Any]:
        errors = validate_envelope(event)
        if errors:
            raise HarmovelaClientError(
                "invalid Harmovela event: " + "; ".join(errors),
                body={"accepted": False, "errors": errors},
            )
        return self.request("POST", "/events", event)

    def stats(self) -> dict[str, Any]:
        return self.request("GET", "/stats")

    def pending(self) -> dict[str, Any]:
        return self.request("GET", "/pending")

    def dead_lettered(self) -> dict[str, Any]:
        return self.request("GET", "/dlq")

    def create_subscription(self, filter_: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.request("POST", "/subscriptions", {"filter": filter_ or {}})

    def list_subscriptions(self) -> list[dict[str, Any]]:
        body = self.request("GET", "/subscriptions")
        return body.get("subscriptions", [])

    def get_subscription(self, subscription_id: str) -> dict[str, Any]:
        return self.request(
            "GET", f"/subscriptions/{quote(subscription_id, safe='')}"
        )

    def delete_subscription(self, subscription_id: str) -> dict[str, Any]:
        return self.request(
            "DELETE", f"/subscriptions/{quote(subscription_id, safe='')}"
        )

    def poll(self, subscription_id: str) -> list[dict[str, Any]]:
        body = self.request(
            "GET",
            f"/subscriptions/{quote(subscription_id, safe='')}/events",
        )
        return body.get("events", [])

    def stream(
        self, subscription_id: str, timeout: float | None = None
    ) -> Iterator[dict[str, Any]]:
        request = Request(
            self.url(f"/subscriptions/{quote(subscription_id, safe='')}/stream"),
            headers={"Accept": "text/event-stream", **self.headers},
            method="GET",
        )
        try:
            with urlopen(request, timeout=timeout or self.timeout) as response:
                for raw in response:
                    line = raw.decode("utf-8").strip()
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if not payload:
                        continue
                    try:
                        yield json.loads(payload)
                    except json.JSONDecodeError as exc:
                        raise HarmovelaClientError(
                            f"invalid Harmovela stream event: {exc}"
                        ) from exc
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise HarmovelaClientError(
                f"Harmovela HTTP {exc.code}: {body[:512]}",
                status=exc.code,
                body=_parse_body(body),
            ) from exc
        except URLError as exc:
            raise HarmovelaClientError(f"Harmovela transport: {exc.reason}") from exc

    def request(
        self,
        method: str,
        route: str,
        body: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> Any:
        data = None if body is None else json.dumps(body).encode("utf-8")
        headers = {"Accept": "application/json", **self.headers}
        if data is not None:
            headers["Content-Type"] = "application/json"
        request = Request(self.url(route), data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=timeout or self.timeout) as response:
                raw = response.read().decode("utf-8")
                status = response.status
        except HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            raise HarmovelaClientError(
                f"Harmovela HTTP {exc.code}: {raw[:512]}",
                status=exc.code,
                body=_parse_body(raw),
            ) from exc
        except URLError as exc:
            raise HarmovelaClientError(f"Harmovela transport: {exc.reason}") from exc
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise HarmovelaClientError(
                f"invalid Harmovela response: HTTP {status}",
                status=status,
                body=raw,
            ) from exc

    def url(self, route: str) -> str:
        suffix = route if route.startswith("/") else f"/{route}"
        return f"{self.base_url}{self.path}{suffix}"


def _normalize_path(value: str) -> str:
    path = value if value.startswith("/") else f"/{value}"
    return path.rstrip("/")


def _parse_body(raw: str) -> Any:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw
