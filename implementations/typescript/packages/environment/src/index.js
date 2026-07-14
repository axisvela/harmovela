export const ENVIRONMENT_EVENT_TYPES = new Set([
  "environment.observed",
  "environment.changed",
  "environment.alerted",
  "environment.error"
]);

export function isEnvironmentEventType(type) {
  return ENVIRONMENT_EVENT_TYPES.has(type);
}
