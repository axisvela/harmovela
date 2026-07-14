export const TOOL_EVENT_TYPES = new Set([
  "tool.call.requested",
  "tool.call.accepted",
  "tool.call.rejected",
  "tool.call.started",
  "tool.call.progress",
  "tool.call.output",
  "tool.call.completed",
  "tool.call.failed",
  "tool.call.cancel.requested",
  "tool.call.cancelled",
  "tool.call.timed_out"
]);

export function isToolEventType(type) {
  return TOOL_EVENT_TYPES.has(type);
}
