package com.axisrobo.aep;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class TaskTracker {
    public enum TaskState { SUBMITTED, ACCEPTED, STARTED, PROGRESS, BLOCKED, OUTPUT, COMPLETED, FAILED, CANCELLED, TIMED_OUT }

    private static final Map<String, TaskState> EVENT_TO_STATE = Map.ofEntries(
        Map.entry("task.submitted", TaskState.SUBMITTED), Map.entry("task.accepted", TaskState.ACCEPTED),
        Map.entry("task.started", TaskState.STARTED), Map.entry("task.progress", TaskState.PROGRESS),
        Map.entry("task.blocked", TaskState.BLOCKED), Map.entry("task.output", TaskState.OUTPUT),
        Map.entry("task.completed", TaskState.COMPLETED), Map.entry("task.failed", TaskState.FAILED),
        Map.entry("task.cancelled", TaskState.CANCELLED), Map.entry("task.timed_out", TaskState.TIMED_OUT)
    );

    private static final Set<TaskState> TERMINAL = Set.of(TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT);

    private static final Map<TaskState, Set<TaskState>> TRANSITIONS = Map.of(
        TaskState.SUBMITTED, Set.of(TaskState.ACCEPTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.ACCEPTED, Set.of(TaskState.STARTED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.STARTED, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.BLOCKED, Set.of(TaskState.STARTED, TaskState.PROGRESS, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.PROGRESS, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT),
        TaskState.OUTPUT, Set.of(TaskState.PROGRESS, TaskState.OUTPUT, TaskState.BLOCKED, TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED, TaskState.TIMED_OUT)
    );

    private final String id;
    private final String source;
    private TaskState state = TaskState.SUBMITTED;
    private int eventId;

    public TaskTracker(String id, String source) {
        this.id = id;
        this.source = source;
    }

    public String id() { return id; }
    public TaskState getState() { return state; }
    public boolean isTerminal() { return TERMINAL.contains(state); }

    public void accept() { transition("task.accepted", null); }

    public Map<String, Object> accepted() { return transition("task.accepted", null); }
    public Map<String, Object> started() { return transition("task.started", null); }
    public Map<String, Object> progress(Map<String, Object> payload) { return transition("task.progress", payload); }
    public Map<String, Object> completed(Map<String, Object> result) { return transition("task.completed", result); }
    public Map<String, Object> failed(String code, String message) {
        return transition("task.failed", Map.of("error", Errors.errorPayload(code, message, false)));
    }

    public Map<String, Object> transition(String eventType, Map<String, Object> payload) {
        var nextState = EVENT_TO_STATE.get(eventType);
        if (nextState == null) return null;

        if (nextState != state) {
            var allowed = TRANSITIONS.get(state);
            if (allowed == null || !allowed.contains(nextState)) return null;
        }
        state = nextState;

        var result = new HashMap<String, Object>();
        if (payload != null) result.putAll(payload);
        result.put("task_id", id);
        result.put("state", state.name().toLowerCase());

        if (TERMINAL.contains(state) && !result.containsKey("result")) {
            result.put("result", state.name().toLowerCase());
        }

        eventId++;
        return Map.<String, Object>of(
            "aep_version", "0.1",
            "id", "evt_task_" + String.format("%06d", eventId),
            "type", eventType,
            "source", source,
            "task_id", id,
            "created_at", Instant.now().toString(),
            "payload", result
        );
    }
}
