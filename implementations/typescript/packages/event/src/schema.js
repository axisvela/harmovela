import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Ajv from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const schemasDir = resolve(here, "../../../../../schemas");

function loadSchema(filename) {
  return JSON.parse(readFileSync(resolve(schemasDir, filename), "utf8"));
}

let _ajv = null;
let _envelopeSchema = null;
let _subscriptionSchema = null;
let _payloadsSchema = null;
let _envelopeValidate = null;
let _subscriptionValidate = null;
let _payloadsValidate = null;

function ensureLoaded() {
  if (_ajv) return;
  _ajv = new Ajv({ allErrors: true, strict: false });
  _envelopeSchema = loadSchema("harmovela-envelope.schema.json");
  _subscriptionSchema = loadSchema("subscription-filter.schema.json");
  _payloadsSchema = loadSchema("harmovela-payloads.schema.json");
  _ajv.addSchema(_envelopeSchema, _envelopeSchema.$id);
  _ajv.addSchema(_subscriptionSchema, _subscriptionSchema.$id);
  _ajv.addSchema(_payloadsSchema, _payloadsSchema.$id);
  _envelopeValidate = _ajv.compile(_envelopeSchema);
  _subscriptionValidate = _ajv.compile(_subscriptionSchema);
  _payloadsValidate = _ajv.compile(_payloadsSchema);
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

export function validatePayloadsSchema(value) {
  ensureLoaded();
  _payloadsValidate(value);
  return _payloadsValidate.errors ?? [];
}

export function isValidBySchema(value, kind = "envelope") {
  const validators = {
    envelope: validateEnvelopeSchema,
    subscription: validateSubscriptionSchema,
    payloads: validatePayloadsSchema
  };
  const validate = validators[kind] ?? validators.envelope;
  return validate(value).length === 0;
}
