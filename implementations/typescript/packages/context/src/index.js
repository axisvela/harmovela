export const CONTEXT_MEMORY_EVENT_TYPES = new Set([
  "context.updated",
  "context.invalidated",
  "context.snapshot.requested",
  "context.snapshot.ready",
  "context.retrieval.started",
  "context.retrieval.completed",
  "context.retrieval.failed",
  "memory.fact.added",
  "memory.fact.updated",
  "memory.fact.invalidated",
  "memory.episode.stored",
  "memory.preference.updated",
  "memory.constraint.updated",
  "memory.summary.ready",
  "memory.retrieval.ready"
]);

export function isContextMemoryEventType(type) {
  return CONTEXT_MEMORY_EVENT_TYPES.has(type);
}
