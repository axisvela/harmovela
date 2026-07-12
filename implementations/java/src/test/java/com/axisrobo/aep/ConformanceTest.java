package com.axisrobo.aep;

import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ConformanceTest {

    private static final Map<String, Integer> LEVEL_ORDER = Map.of("AEP-C0", 0, "AEP-C1", 1, "AEP-C2", 2, "AEP-C3", 3);

    @Test
    void manifestDeclaresKnownDraftLevels() throws Exception {
        var manifest = Fixtures.loadManifest("../../conformance/manifest.json");
        assertEquals(List.of("AEP-C0", "AEP-C1", "AEP-C2", "AEP-C3"), manifest.levels());
        assertEquals("AEP-C3", manifest.default_target_level());
    }

    @Test
    void conformanceFixtures() throws Exception {
        var manifest = Fixtures.loadManifest("../../conformance/manifest.json");
        var targetOrder = LEVEL_ORDER.getOrDefault(manifest.default_target_level(), 1);

        for (var fixture : manifest.fixtures()) {
            var fixtureOrder = LEVEL_ORDER.getOrDefault(fixture.level(), -1);
            if (fixtureOrder > targetOrder) {
                System.out.println("SKIP " + fixture.level() + " " + fixture.path());
                continue;
            }

            var absPath = Path.of("../../conformance", fixture.path()).toString();
            var events = Fixtures.loadFixture(absPath);

            var types = events.stream().map(e -> (String) e.get("type")).toList();
            assertEquals(fixture.expectedTypes(), types, "type mismatch for " + fixture.path());

            for (int i = 0; i < events.size(); i++) {
                var errs = Envelope.validate(events.get(i));
                assertTrue(errs.isEmpty(), "event " + i + " envelope validation: " + errs);
            }

            if ("stateful_flow".equals(fixture.expectation())) {
                var harness = new Harness();
                for (int i = 0; i < events.size(); i++) {
                    var responses = harness.handle(events.get(i));
                    for (var resp : responses) {
                        if ("event.rejected".equals(resp.get("type"))) {
                            var errMsg = "unknown";
                            if (resp.get("payload") instanceof Map<?, ?> p
                                && p.get("error") instanceof Map<?, ?> e) {
                                errMsg = String.valueOf(e.get("message"));
                            }
                            fail("event " + i + " rejected: " + errMsg);
                        }
                    }
                }
            }

            if ("delivery_e2e".equals(fixture.expectation())) {
                var harness = new Harness();
                for (int i = 0; i < events.size(); i++) {
                    var responses = harness.handle(events.get(i));
                    for (var resp : responses) {
                        if ("event.rejected".equals(resp.get("type"))) {
                            var errMsg = "unknown";
                            if (resp.get("payload") instanceof Map<?, ?> p
                                && p.get("error") instanceof Map<?, ?> e) {
                                errMsg = String.valueOf(e.get("message"));
                            }
                            fail("event " + i + " rejected: " + errMsg);
                        }
                    }
                }
                var expectedStats = fixture.expectedStats();
                if (expectedStats != null) {
                    var stats = harness.getDelivery().getStats();
                    for (var entry : expectedStats.entrySet()) {
                        var key = entry.getKey();
                        var expected = entry.getValue();
                        var actual = stats.get(key);
                        assertEquals(expected, actual, "delivery stat " + key);
                    }
                }
            }
        }
    }
}
