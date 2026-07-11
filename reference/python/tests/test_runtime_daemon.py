from aep.runtime.config import default_config
from aep.runtime.server import start_daemon


def test_start_daemon_returns_service():
    config = default_config()
    config["delivery"]["store"] = "memory"
    config["transports"]["websocket"]["enabled"] = False
    config["transports"]["sse"]["enabled"] = False
    config["transports"]["api"] = {"enabled": True, "host": "127.0.0.1", "port": 0, "path": "/aep/api"}
    service = start_daemon(config=config, install_signals=False)
    assert service.started is True
    assert "api" in service.transports
    service.stop()
