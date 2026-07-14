import asyncio
import json
import subprocess
import sys
import urllib.error
import urllib.request

import click

from harmovela_runtime.config import write_default_config, load_config, create_delivery_store
from harmovela_runtime.server import start_daemon


@click.group()
def cli():
    """Agent Event Protocol CLI."""


@cli.command()
@click.option("--config", "config_path", default="harmovela.config.json", help="config file path")
def init(config_path):
    """Create a Harmovela runtime config file."""
    write_default_config(config_path)
    click.echo(f"created {config_path}")


@cli.command()
@click.option("--config", "config_path", default=None, help="config file path")
def start(config_path):
    """Start the local aepd runtime daemon."""
    import time
    service = start_daemon(config_path=config_path)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        service.stop()


@cli.command()
@click.option("--url", default="http://127.0.0.1:8790/harmovela/api/healthz", help="health endpoint URL")
def status(url):
    """Query an aepd health endpoint."""
    try:
        with urllib.request.urlopen(url) as resp:
            click.echo(resp.read().decode())
    except Exception as err:
        click.echo(f"status request failed: {err}", err=True)
        sys.exit(1)


@cli.command()
@click.argument("event_type")
@click.option("--payload", default="{}", help="event payload JSON")
@click.option("--url", default="ws://127.0.0.1:8787/harmovela", help="WebSocket URL")
@click.option("--event-id", default=None, help="event id")
@click.option("--source", default="cli:emit", help="event source")
def emit(event_type, payload, url, event_id, source):
    """Emit one Harmovela event over WebSocket."""
    import uuid
    from datetime import datetime, timezone
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        click.echo("invalid JSON payload", err=True)
        sys.exit(1)
    event = {
        "spec_version": "0.2",
        "id": event_id or f"evt_{uuid.uuid4().hex}",
        "type": event_type,
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "payload": parsed,
    }
    asyncio.run(_emit_ws(url, event))
    click.echo(json.dumps(event))


async def _emit_ws(url, event):
    import websockets
    async with websockets.connect(url, subprotocols=["harmovela-0.2"]) as ws:
        await ws.send(json.dumps(event))


@cli.command()
@click.option("--type", "pattern", default="*", help="event type pattern")
@click.option("--url", default="ws://127.0.0.1:8787/harmovela", help="WebSocket URL")
def subscribe(pattern, url):
    """Subscribe to Harmovela events over WebSocket."""
    from axisrobo_harmovela_event import matches_type
    asyncio.run(_subscribe_ws(url, pattern, matches_type))


async def _subscribe_ws(url, pattern, matches_type):
    import websockets
    async with websockets.connect(url, subprotocols=["harmovela-0.2"]) as ws:
        async for message in ws:
            event = json.loads(message)
            if matches_type(pattern, event.get("type")):
                click.echo(json.dumps(event))


@cli.command()
@click.argument("subcommand", default="list")
@click.option("--config", "config_path", default="harmovela.config.json", help="config file path")
def dlq(subcommand, config_path):
    """Inspect dead-lettered events."""
    if subcommand != "list":
        click.echo(f"unsupported dlq command: {subcommand}", err=True)
        sys.exit(1)
    config = load_config(config_path)
    store = create_delivery_store(config)
    stats = store.get_stats() if hasattr(store, "get_stats") else {}
    records = store.get_dead_lettered() if hasattr(store, "get_dead_lettered") else []
    click.echo(json.dumps({"deadLettered": stats.get("deadLettered", len(records)), "records": records}))
    if hasattr(store, "close"):
        store.close()


@cli.command()
@click.option("--level", default=None, help="target conformance level")
@click.option("--profile", default=None, help="conformance profile to filter fixtures")
def conformance(level, profile):
    """Run the conformance test suite."""
    import os
    env = os.environ.copy()
    if profile:
        env["HARMOVELA_PROFILE"] = profile
    args = [sys.executable, "-m", "pytest", "tests/test_fixtures.py", "-q"]
    result = subprocess.run(args, env=env)
    sys.exit(result.returncode)


@cli.group()
def subscriptions():
    """Manage runtime subscriptions over HTTP."""


@subscriptions.command("create")
@click.option("--filter", "filter_text", default="{}", help="subscription filter JSON")
@click.option("--base", default="http://127.0.0.1:8790/harmovela/api", help="runtime API base URL")
def subscriptions_create(filter_text, base):
    try:
        filter_ = json.loads(filter_text)
    except json.JSONDecodeError:
        click.echo("invalid JSON filter", err=True)
        sys.exit(1)
    data = json.dumps({"filter": filter_}).encode()
    req = urllib.request.Request(f"{base}/subscriptions", data=data,
                                headers={"Content-Type": "application/json"}, method="POST")
    _print_response(req)


@subscriptions.command("list")
@click.option("--base", default="http://127.0.0.1:8790/harmovela/api", help="runtime API base URL")
def subscriptions_list(base):
    req = urllib.request.Request(f"{base}/subscriptions", method="GET")
    _print_response(req)


@subscriptions.command("delete")
@click.argument("subscription_id")
@click.option("--base", default="http://127.0.0.1:8790/harmovela/api", help="runtime API base URL")
def subscriptions_delete(subscription_id, base):
    req = urllib.request.Request(f"{base}/subscriptions/{subscription_id}", method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            click.echo(resp.read().decode())
    except urllib.error.HTTPError as err:
        if err.code == 404:
            click.echo("not found", err=True)
        else:
            click.echo(f"request failed: HTTP {err.code}", err=True)
        sys.exit(1)
    except Exception as err:
        click.echo(f"request failed: {err}. Is aepd running?", err=True)
        sys.exit(1)


@subscriptions.command("stream")
@click.argument("subscription_id")
@click.option("--base", default="http://127.0.0.1:8790/harmovela/api", help="runtime API base URL")
def subscriptions_stream(subscription_id, base):
    try:
        resp = urllib.request.urlopen(f"{base}/subscriptions/{subscription_id}/stream")
    except urllib.error.HTTPError as err:
        if err.code == 404:
            click.echo("not found", err=True)
        else:
            click.echo(f"request failed: HTTP {err.code}", err=True)
        sys.exit(1)
    except Exception as err:
        click.echo(f"request failed: {err}. Is aepd running?", err=True)
        sys.exit(1)
    try:
        for raw in resp:
            line = raw.decode()
            if line.startswith("data: "):
                click.echo(line[len("data: "):].rstrip("\n"))
    except KeyboardInterrupt:
        pass


def _print_response(req):
    try:
        with urllib.request.urlopen(req) as resp:
            click.echo(resp.read().decode())
    except urllib.error.HTTPError as err:
        click.echo(f"request failed: HTTP {err.code}", err=True)
        sys.exit(1)
    except Exception as err:
        click.echo(f"request failed: {err}. Is aepd running?", err=True)
        sys.exit(1)


if __name__ == "__main__":
    cli()
