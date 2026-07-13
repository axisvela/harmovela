import pytest
from axisrobo_harmovela_task import TaskTracker


class TestTask:
    def test_happy_path(self):
        t = TaskTracker(task_id="task_01")
        t.submitted()
        t.accepted()
        t.started()
        t.progress({"progress": 0.5})
        t.output({"data": "partial"})
        done = t.completed({"summary": "done"})
        assert done["type"] == "task.completed"
        assert t.is_terminal() is True

    def test_failure(self):
        t = TaskTracker(task_id="task_02")
        t.submitted(); t.accepted(); t.started()
        failed = t.failed("tool_timeout", "too slow", {"elapsed_ms": 5000})
        assert failed["type"] == "task.failed"
        assert failed["payload"]["error"]["code"] == "tool_timeout"
        assert t.is_terminal() is True

    def test_cancellation(self):
        t = TaskTracker(task_id="task_03")
        t.submitted(); t.accepted()
        cancelled = t.cancelled("user requested")
        assert cancelled["type"] == "task.cancelled"
        assert t.is_terminal() is True

    def test_blocked_resume(self):
        t = TaskTracker(task_id="task_04")
        t.submitted(); t.accepted(); t.started()
        blocked = t.blocked("waiting for dep")
        assert blocked["type"] == "task.blocked"
        resumed = t.started()
        assert resumed["type"] == "task.started"
        t.completed()

    def test_illegal_transition(self):
        t = TaskTracker(task_id="task_05")
        with pytest.raises(RuntimeError, match="illegal"):
            t.completed()

    def test_timed_out(self):
        t = TaskTracker(task_id="task_06")
        t.submitted(); t.accepted(); t.started()
        timed = t.timed_out()
        assert timed["type"] == "task.timed_out"
        assert timed["payload"]["error"]["retryable"] is True
        assert t.is_terminal() is True
