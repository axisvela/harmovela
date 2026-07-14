export const AGENT_EVENT_TYPES = new Set([
  "agent.message.sent",
  "agent.message.received",
  "agent.message.failed",
  "agent.request.created",
  "agent.response.created",
  "agent.decision.recorded"
]);

export function isAgentEventType(type) {
  return AGENT_EVENT_TYPES.has(type);
}
