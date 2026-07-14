export const STATE_EVENT_TYPES = new Set([
  "state.snapshot.requested",
  "state.snapshot.ready",
  "state.delta.applied",
  "state.invalidated",
  "freshness.expired",
  "freshness.window.changed"
]);

export function isStateEventType(type) {
  return STATE_EVENT_TYPES.has(type);
}
