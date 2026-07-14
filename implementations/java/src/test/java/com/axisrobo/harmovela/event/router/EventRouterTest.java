package com.axisrobo.harmovela.event.router;

import com.axisrobo.harmovela.event.router.EventRouter;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class EventRouterTest {

    @Test
    void dispatchesToMatchingHandler() {
        var router = new EventRouter();
        var called = new boolean[]{false};
        router.on(event -> "task.started".equals(event.get("type")), event -> {
            called[0] = true;
            return Map.<String, Object>of("type", "event.acknowledged");
        });
        var results = router.dispatch(Map.of("type", "task.started"));
        assertTrue(called[0]);
        assertEquals(1, results.size());
    }

    @Test
    void matchAllHandlerReceivesEveryEvent() {
        var router = new EventRouter();
        var count = new int[]{0};
        router.onAll(event -> { count[0]++; return null; });
        router.dispatch(Map.of("type", "task.started"));
        router.dispatch(Map.of("type", "session.opened"));
        assertEquals(2, count[0]);
    }

    @Test
    void collectsMultipleResponses() {
        var router = new EventRouter();
        router.onAll(event -> List.of(
            Map.<String, Object>of("type", "event.acknowledged"),
            Map.<String, Object>of("type", "session.ready")
        ));
        var results = router.dispatch(Map.of("type", "task.started"));
        assertEquals(2, results.size());
    }

    @Test
    void noMatchReturnsEmpty() {
        var router = new EventRouter();
        router.on(event -> false, event -> Map.<String, Object>of("type", "event.acknowledged"));
        var results = router.dispatch(Map.of("type", "task.started"));
        assertTrue(results.isEmpty());
    }

    @Test
    void handlesListOfAnyResponse() {
        var router = new EventRouter();
        router.onAll(event -> List.of(
            Map.<String, Object>of("type", "event.acknowledged"),
            Map.<String, Object>of("type", "task.completed")
        ));
        var results = router.dispatch(Map.of("type", "task.started"));
        assertEquals(2, results.size());
    }
}
