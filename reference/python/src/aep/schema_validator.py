import json
from pathlib import Path
from jsonschema import validate as _validate, ValidationError

_SCHEMA_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "schemas"

with open(_SCHEMA_DIR / "aep-envelope.schema.json", encoding="utf-8") as f:
    ENVELOPE_SCHEMA = json.load(f)

with open(_SCHEMA_DIR / "subscription-filter.schema.json", encoding="utf-8") as f:
    SUBSCRIPTION_SCHEMA = json.load(f)


def validate_envelope_schema(value: dict) -> list:
    try:
        _validate(value, ENVELOPE_SCHEMA)
        return []
    except ValidationError as e:
        return [{"path": list(e.absolute_path), "message": e.message}]


def validate_subscription_schema(value: dict) -> list:
    try:
        _validate(value, SUBSCRIPTION_SCHEMA)
        return []
    except ValidationError as e:
        return [{"path": list(e.absolute_path), "message": e.message}]


def is_valid_by_schema(value: dict, kind: str = "envelope") -> bool:
    schema = ENVELOPE_SCHEMA if kind == "envelope" else SUBSCRIPTION_SCHEMA
    try:
        _validate(value, schema)
        return True
    except ValidationError:
        return False
