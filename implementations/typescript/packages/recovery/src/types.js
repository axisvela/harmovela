export const RECOVERY_EVENT_TYPES = new Set([
  "interruption.requested",
  "interruption.acknowledged",
  "interruption.saved",
  "interruption.resumed",
  "interruption.cancelled",
  "compensation.requested",
  "compensation.completed"
]);

export function isRecoveryEventType(type) {
  return RECOVERY_EVENT_TYPES.has(type);
}
