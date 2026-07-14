package com.axisrobo.harmovela.task;

import com.axisrobo.harmovela.event.Errors;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class TaskTrackerTest {
    @Test
    void lifecycleMethodsReturnEvents() {
        var tk = new TaskTracker("task_1", "tool:build");
        assertEquals("task_1", tk.id());

        var accepted = tk.accepted();
        assertEquals("task.accepted", accepted.get("type"));
        assertEquals("task_1", accepted.get("task_id"));

        var started = tk.started();
        assertEquals("task.started", started.get("type"));

        var progress = tk.progress(Map.of("progress", 0.5));
        assertEquals("task.progress", progress.get("type"));
        @SuppressWarnings("unchecked")
        var payload = (Map<String, Object>) progress.get("payload");
        assertEquals(0.5, payload.get("progress"));

        var completed = tk.completed(Map.of("artifact", "app.bin"));
        assertEquals("task.completed", completed.get("type"));
    }

    @Test
    void failedIncludesErrorPayload() {
        var tk = new TaskTracker("task_2", "tool:build");
        tk.accepted();
        tk.started();
        var failed = tk.failed(Errors.TOOL_ERROR, "boom");
        assertEquals("task.failed", failed.get("type"));
        @SuppressWarnings("unchecked")
        var payload = (Map<String, Object>) failed.get("payload");
        @SuppressWarnings("unchecked")
        var error = (Map<String, Object>) payload.get("error");
        assertEquals(Errors.TOOL_ERROR, error.get("code"));
    }

    @Test
    void illegalTransitionReturnsNull() {
        var tk = new TaskTracker("task_3", "tool:build");
        assertNull(tk.transition("task.completed", null));
    }
}
