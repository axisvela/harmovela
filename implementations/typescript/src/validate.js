import { isStandardEventType } from "./event-types.js";

const DELIVERY_MODES = new Set(["best_effort", "at_least_once", "replayable"]);

export function validateEnvelope(value) {
  const errors = [];

  if (!isPlainObject(value)) {
    return ["event must be a JSON object"];
  }

  requireString(value, "spec_version", errors);
  requireString(value, "id", errors);
  requireString(value, "type", errors);
  requireString(value, "source", errors);
  requireString(value, "created_at", errors);

  if (!Object.hasOwn(value, "payload")) {
    errors.push("payload is required");
  }

  if (typeof value.type === "string" && !isStandardEventType(value.type)) {
    errors.push(`type is not in the standard draft registry: ${value.type}`);
  }

  if (typeof value.created_at === "string" && Number.isNaN(Date.parse(value.created_at))) {
    errors.push("created_at must be an ISO-compatible timestamp");
  }

  if (value.delivery !== undefined) {
    validateDelivery(value.delivery, errors);
  }

  if (value.type === "subscription.requested") {
    validateSubscriptionPayload(value.payload, errors);
  }

  return errors;
}

function requireString(value, field, errors) {
  if (typeof value[field] !== "string" || value[field].length === 0) {
    errors.push(`${field} must be a non-empty string`);
  }
}

function validateDelivery(delivery, errors) {
  if (!isPlainObject(delivery)) {
    errors.push("delivery must be an object when present");
    return;
  }

  if (delivery.mode !== undefined && !DELIVERY_MODES.has(delivery.mode)) {
    errors.push(`delivery.mode must be one of: ${Array.from(DELIVERY_MODES).join(", ")}`);
  }
}

function validateSubscriptionPayload(payload, errors) {
  if (!isPlainObject(payload)) {
    errors.push("subscription.requested payload must be an object");
    return;
  }

  if (payload.types !== undefined && !isStringOrStringArray(payload.types)) {
    errors.push("subscription payload types must be a string or string array");
  }

  for (const field of ["source", "target", "topic", "session_id", "conversation_id", "task_id"]) {
    if (payload[field] !== undefined && !isStringOrStringArray(payload[field])) {
      errors.push(`subscription payload ${field} must be a string or string array`);
    }
  }
}

function isStringOrStringArray(value) {
  return typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string"));
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
