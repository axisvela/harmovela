package task

import "testing"

func TestTrackerLifecycleMethods(t *testing.T) {
	tk := NewTracker("task_1", "tool:build", "build app")

	accepted := tk.Accepted()
	if accepted["type"] != "task.accepted" {
		t.Fatalf("expected task.accepted, got %v", accepted["type"])
	}
	if accepted["task_id"] != "task_1" {
		t.Fatalf("expected task_1, got %v", accepted["task_id"])
	}

	started := tk.Started()
	if started["type"] != "task.started" {
		t.Fatalf("expected task.started, got %v", started["type"])
	}

	progress := tk.Progress(map[string]any{"progress": 0.5})
	if progress["type"] != "task.progress" {
		t.Fatalf("expected task.progress, got %v", progress["type"])
	}
	payload := progress["payload"].(map[string]any)
	if payload["progress"] != 0.5 {
		t.Fatalf("expected progress 0.5, got %v", payload["progress"])
	}

	completed := tk.Completed(map[string]any{"artifact": "app.bin"})
	if completed["type"] != "task.completed" {
		t.Fatalf("expected task.completed, got %v", completed["type"])
	}
}

func TestTrackerIllegalTransition(t *testing.T) {
	tk := NewTracker("task_3", "tool:build", "build app")
	if result := tk.Transition("task.completed", nil); result != nil {
		t.Fatalf("expected nil for illegal transition, got %v", result)
	}
}

func TestTrackerFailed(t *testing.T) {
	tk := NewTracker("task_2", "tool:build", "build app")
	tk.Accepted()
	tk.Started()
	failed := tk.Failed("tool_error", "boom")
	if failed["type"] != "task.failed" {
		t.Fatalf("expected task.failed, got %v", failed["type"])
	}
	payload := failed["payload"].(map[string]any)
	errObj := payload["error"].(map[string]any)
	if errObj["code"] != "tool_error" {
		t.Fatalf("expected tool_error, got %v", errObj["code"])
	}
}
