import copy
import json
import os

from ..delivery_store import InMemoryDeliveryStore
from ..sqlite_delivery_store import SqliteDeliveryStore
from ..postgres_delivery_store import PostgresDeliveryStore


def default_config() -> dict:
    return {
        "aep_version": "0.1",
        "runtime": {"id": "aepd-local", "source": "runtime:aepd"},
        "transports": {
            "websocket": {"enabled": True, "host": "127.0.0.1", "port": 8787, "path": "/aep"},
            "sse": {"enabled": True, "host": "127.0.0.1", "port": 8788, "path": "/aep/events"},
            "api": {"enabled": True, "host": "127.0.0.1", "port": 8790, "path": "/aep/api"},
            "stdio": {"enabled": False},
        },
        "delivery": {
            "store": "sqlite",
            "sqlite": {"path": ".aep/aep.sqlite"},
            "postgres": {"url": "postgres://postgres:postgres@localhost:5433/postgres"},
        },
    }


def write_default_config(path: str = "aep.config.json") -> str:
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(default_config(), indent=2) + "\n")
    return path


def load_config(path: str | None = None, env: dict | None = None) -> dict:
    if env is None:
        env = os.environ
    if path is None:
        path = env.get("AEP_CONFIG", "aep.config.json")
    with open(path, "r", encoding="utf-8") as f:
        parsed = json.load(f)
    return apply_env_overrides(parsed, env)


def apply_env_overrides(config: dict, env: dict | None = None) -> dict:
    if env is None:
        env = os.environ
    nxt = copy.deepcopy(config)
    if env.get("AEPD_HOST"):
        nxt["transports"]["websocket"]["host"] = env["AEPD_HOST"]
        nxt["transports"]["sse"]["host"] = env["AEPD_HOST"]
        nxt["transports"]["api"]["host"] = env["AEPD_HOST"]
    if env.get("AEPD_WS_PORT"):
        nxt["transports"]["websocket"]["port"] = int(env["AEPD_WS_PORT"])
    if env.get("AEPD_SSE_PORT"):
        nxt["transports"]["sse"]["port"] = int(env["AEPD_SSE_PORT"])
    if env.get("AEPD_API_PORT"):
        nxt["transports"]["api"]["port"] = int(env["AEPD_API_PORT"])
    if env.get("AEP_POSTGRES_URL"):
        nxt["delivery"]["postgres"]["url"] = env["AEP_POSTGRES_URL"]
    return nxt


def create_delivery_store(config: dict):
    delivery = config.get("delivery", {"store": "memory"})
    store = delivery.get("store", "memory")
    if store == "memory":
        return InMemoryDeliveryStore()
    if store == "sqlite":
        return SqliteDeliveryStore(delivery.get("sqlite", {}).get("path", ":memory:"))
    if store == "postgres":
        return PostgresDeliveryStore(
            delivery.get("postgres", {}).get("url") or os.environ.get("AEP_POSTGRES_URL"),
            stream_id=delivery.get("stream_id", "stream_01"),
        )
    raise ValueError(f"unsupported delivery store: {store}")
