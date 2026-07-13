export const STANDARD_EVENT_TYPES = new Set([
  "session.opened",
  "session.ready",
  "session.heartbeat",
  "session.closed",
  "session.error",
  "capabilities.requested",
  "capabilities.declared",
  "capabilities.changed",
  "subscription.requested",
  "subscription.created",
  "subscription.rejected",
  "subscription.cancelled",
  "subscription.expired"
]);

export function isStandardEventType(type) {
  return STANDARD_EVENT_TYPES.has(type);
}
