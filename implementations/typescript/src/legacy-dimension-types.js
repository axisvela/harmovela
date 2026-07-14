import { CONTEXT_MEMORY_EVENT_TYPES } from "@axisrobo/harmovela-context";
import { DELEGATION_EVENT_TYPES } from "@axisrobo/harmovela-delegation";
import { RECOVERY_EVENT_TYPES } from "@axisrobo/harmovela-recovery";
import { STATE_EVENT_TYPES } from "@axisrobo/harmovela-state";
import { TOOL_EVENT_TYPES } from "@axisrobo/harmovela-tool";
import { AGENT_EVENT_TYPES } from "@axisrobo/harmovela-agent";
import { ENVIRONMENT_EVENT_TYPES } from "@axisrobo/harmovela-environment";

const LEGACY_DIMENSION_EVENT_TYPES = new Set([
  "event.acknowledged",
  "event.rejected",
  "event.redelivered",
  "event.replayed",
  "event.dead_lettered",
  "task.submitted",
  "task.accepted",
  "task.started",
  "task.blocked",
  "task.progress",
  "task.output",
  "task.completed",
  "task.failed",
  "task.cancel.requested",
  "task.cancelled",
  "task.timed_out",
  ...CONTEXT_MEMORY_EVENT_TYPES,
  ...DELEGATION_EVENT_TYPES,
  ...RECOVERY_EVENT_TYPES,
  ...STATE_EVENT_TYPES,
  ...TOOL_EVENT_TYPES,
  ...AGENT_EVENT_TYPES,
  ...ENVIRONMENT_EVENT_TYPES,
]);

export function isLegacyDimensionEventType(type) {
  return LEGACY_DIMENSION_EVENT_TYPES.has(type);
}
