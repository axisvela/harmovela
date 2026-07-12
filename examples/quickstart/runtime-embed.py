#!/usr/bin/env python3
"""Minimal AEP runtime: create service, subscribe, publish, receive."""
from aep.runtime.config import default_config
from aep.runtime.service import AepRuntimeService

config = default_config()
config["delivery"]["store"] = "memory"
config["transports"]["websocket"]["enabled"] = False
config["transports"]["sse"]["enabled"] = False
config["transports"]["api"]["enabled"] = False

service = AepRuntimeService(config)
service.subscribe("task.*", lambda e: print(f"received {e['type']} {e['id']}"))

service.start()
service.publish({
    "spec_version": "0.2",
    "id": "evt_embed",
    "type": "task.submitted",
    "source": "example:quickstart",
    "created_at": "2026-07-12T10:00:00Z",
    "payload": {"task_id": "task_01"},
})
service.stop()
