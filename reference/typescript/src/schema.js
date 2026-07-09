import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const schemasDir = resolve(here, "../../../schemas");

function loadSchema(filename) {
  return JSON.parse(readFileSync(resolve(schemasDir, filename), "utf8"));
}

let _ajv = null;
let _envelopeSchema = null;
let _subscriptionSchema = null;
let _envelopeValidate = null;
let _subscriptionValidate = null;

function ensureLoaded() {
  if (_ajv) return;
  _ajv = new Ajv({ allErrors: true, strict: false });
  _envelopeSchema = loadSchema("aep-envelope.schema.json");
  _subscriptionSchema = loadSchema("subscription-filter.schema.json");
  _ajv.addSchema(_envelopeSchema, _envelopeSchema.$id);
  _ajv.addSchema(_subscriptionSchema, _subscriptionSchema.$id);
  _envelopeValidate = _ajv.compile(_envelopeSchema);
  _subscriptionValidate = _ajv.compile(_subscriptionSchema);
}

export function validateEnvelopeSchema(value) {
  ensureLoaded();
  _envelopeValidate(value);
  return _envelopeValidate.errors ?? [];
}

export function validateSubscriptionSchema(value) {
  ensureLoaded();
  _subscriptionValidate(value);
  return _subscriptionValidate.errors ?? [];
}

export function isValidBySchema(value, kind = "envelope") {
  const validate = kind === "envelope" ? validateEnvelopeSchema : validateSubscriptionSchema;
  return validate(value).length === 0;
}
