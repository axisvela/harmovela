export const DELEGATION_EVENT_TYPES = new Set([
  "delegation.requested",
  "delegation.accepted",
  "delegation.rejected",
  "delegation.handoff.completed",
  "delegation.escalated"
]);

export function isDelegationEventType(type) {
  return DELEGATION_EVENT_TYPES.has(type);
}
