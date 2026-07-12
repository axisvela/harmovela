import signal

from .config import load_config
from .service import AepRuntimeService


def start_daemon(config=None, config_path=None, install_signals=True) -> AepRuntimeService:
    if config is None:
        config = load_config(config_path)
    service = AepRuntimeService(config)
    service.start()
    ws = service.transports.get("websocket")
    api = service.transports.get("api")
    ws_port = ws.port if ws else "disabled"
    api_port = api.port if api else "disabled"
    print(f"aepd started ws={ws_port} api={api_port}", flush=True)

    if install_signals:
        def handle(_signum, _frame):
            service.stop()
            raise SystemExit(0)
        signal.signal(signal.SIGINT, handle)
        signal.signal(signal.SIGTERM, handle)

    return service


def main():
    import os
    import time
    service = start_daemon(config_path=os.environ.get("AEP_CONFIG"))
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        service.stop()


if __name__ == "__main__":
    main()
