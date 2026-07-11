import json
import os
import tempfile
from aep.runtime.config import default_config, write_default_config, load_config, apply_env_overrides, create_delivery_store
from aep.delivery_store import InMemoryDeliveryStore
from aep.sqlite_delivery_store import SqliteDeliveryStore


def test_default_config():
    config = default_config()
    assert config["aep_version"] == "0.1"
    assert config["runtime"]["id"] == "aepd-local"
    assert config["delivery"]["store"] == "sqlite"
    assert config["transports"]["websocket"]["port"] == 8787
    assert config["transports"]["api"]["port"] == 8790


def test_write_and_load_config():
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, "aep.config.json")
        write_default_config(path)
        config = load_config(path, env={})
        assert config["runtime"]["source"] == "runtime:aepd"


def test_apply_env_overrides():
    config = apply_env_overrides(default_config(), {
        "AEPD_HOST": "0.0.0.0",
        "AEPD_WS_PORT": "9001",
        "AEPD_API_PORT": "9003",
        "AEP_POSTGRES_URL": "postgres://example/db",
    })
    assert config["transports"]["websocket"]["host"] == "0.0.0.0"
    assert config["transports"]["websocket"]["port"] == 9001
    assert config["transports"]["api"]["port"] == 9003
    assert config["delivery"]["postgres"]["url"] == "postgres://example/db"


def test_create_delivery_store():
    mem = create_delivery_store({"delivery": {"store": "memory"}})
    assert isinstance(mem, InMemoryDeliveryStore)
    sqlite = create_delivery_store({"delivery": {"store": "sqlite", "sqlite": {"path": ":memory:"}}})
    assert isinstance(sqlite, SqliteDeliveryStore)
    sqlite.close()
