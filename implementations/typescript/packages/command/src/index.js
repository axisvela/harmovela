export const COMMAND_EVENT_TYPES = new Set([
  "command.requested",
  "command.accepted",
  "command.rejected",
  "command.completed",
  "command.failed"
]);

export function isCommandEventType(type) {
  return COMMAND_EVENT_TYPES.has(type);
}
