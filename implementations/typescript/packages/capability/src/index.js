export const CAPABILITY_EVENT_TYPES = new Set([
  "capability.registered",
  "capability.updated",
  "capability.deprecated",
  "capability.composed",
  "capability.validated"
]);

export function isCapabilityEventType(type) {
  return CAPABILITY_EVENT_TYPES.has(type);
}
