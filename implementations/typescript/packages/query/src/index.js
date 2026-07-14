export const QUERY_EVENT_TYPES = new Set([
  "query.requested",
  "query.response",
  "query.rejected",
  "query.error"
]);

export function isQueryEventType(type) {
  return QUERY_EVENT_TYPES.has(type);
}
