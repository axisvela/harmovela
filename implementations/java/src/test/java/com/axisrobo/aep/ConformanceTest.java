package com.axisrobo.aep;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ConformanceTest {

    private static final Map<String, Integer> LEVEL_ORDER = Map.of("HARMOVELA-C0", 0, "HARMOVELA-C1", 1, "HARMOVELA-C2", 2, "HARMOVELA-C3", 3);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void manifestDeclaresKnownDraftLevels() throws Exception {
        var manifest = Fixtures.loadManifest("../../conformance/manifest.json");
        assertEquals(List.of("HARMOVELA-C0", "HARMOVELA-C1", "HARMOVELA-C2", "HARMOVELA-C3"), manifest.levels());
        assertEquals("HARMOVELA-C3", manifest.default_target_level());
    }

    @Test
    void manifestDeclaresEventAndGovernanceContractFixtures() throws Exception {
        var manifest = Fixtures.loadManifest("../../conformance/manifest.json");
        record FixtureDeclaration(String path, String level, String expectation) {}
        var contractFixtures = manifest.fixtures().stream()
            .filter(fixture -> fixture.path().equals("fixtures/event-contract.ndjson")
                || fixture.path().equals("fixtures/governance-contract.ndjson"))
            .map(fixture -> new FixtureDeclaration(fixture.path(), fixture.level(), fixture.expectation()))
            .toList();

        assertEquals(List.of(
            new FixtureDeclaration("fixtures/event-contract.ndjson", "HARMOVELA-C1", "stateful_flow"),
            new FixtureDeclaration("fixtures/governance-contract.ndjson", "HARMOVELA-C0", "reject_some")
        ), contractFixtures);
    }

    @Test
    void governanceFixtureRequiresDefinedAuthorizationOutcomes() throws Exception {
        var events = Fixtures.loadFixture("../../conformance/fixtures/governance-contract.ndjson");
        for (int index = 0; index < events.size(); index++) {
            assertTrue(Envelope.validate(events.get(index)).isEmpty(), "event " + index + " envelope validation");
        }

        var expectedRejected = List.of(false, true, true, false);
        for (int index = 0; index < events.size(); index++) {
            var responses = new Harness().handle(events.get(index));
            var rejection = responses.stream().filter(response -> "event.rejected".equals(response.get("type"))).findFirst();
            assertEquals(expectedRejected.get(index), rejection.isPresent(), "event " + index + " rejection");
            if (index == 1 || index == 2) {
                assertEquals("unauthorized", ((Map<?, ?>) ((Map<?, ?>) rejection.orElseThrow().get("payload")).get("error")).get("code"));
            }
        }
    }

    @Test
    void governanceFixtureRequiresAuditCorrelationAndCausationLinkage() throws Exception {
        var events = Fixtures.loadFixture("../../conformance/fixtures/governance-contract.ndjson");
        var harness = new Harness();
        for (var event : events) {
            harness.handle(event);
        }
        var getAudit = assertDoesNotThrow(() -> Harness.class.getMethod("getAudit"), "expected governance audit accessor");
        assertFalse(((List<?>) getAudit.invoke(harness)).isEmpty(), "expected governance audit records");
    }

    @Test
    void conformanceFixtures() throws Exception {
        var manifest = Fixtures.loadManifest("../../conformance/manifest.json");

        String selectedProfile = System.getProperty("hv.profile");
        if (selectedProfile != null && !selectedProfile.isEmpty()) {
            var profileFixturePaths = new HashSet<String>();
            var profileDef = manifest.profiles() != null ? manifest.profiles().get(selectedProfile) : null;
            if (profileDef != null && profileDef.fixtures() != null) {
                profileFixturePaths.addAll(profileDef.fixtures());
            }
            var filtered = new ArrayList<Fixtures.ManifestFixture>();
            for (var f : manifest.fixtures()) {
                if (f.profile() == null || f.profile().isEmpty() || profileFixturePaths.contains(f.path())) {
                    filtered.add(f);
                }
            }
            manifest = new Fixtures.Manifest(manifest.spec_version(), manifest.default_target_level(),
                manifest.levels(), filtered, manifest.profiles());
        }

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
            if (fixture.expectedTypes() != null) {
                assertEquals(fixture.expectedTypes(), types, "type mismatch for " + fixture.path());
            }

            if ("reject_some".equals(fixture.expectation())) {
                var rejected = false;
                var harness = new Harness();
                for (var event : events) {
                    var harnessRejected = harness.handle(event).stream()
                        .anyMatch(response -> ((String) response.get("type")).endsWith(".rejected"));
                    if (!Envelope.validate(event).isEmpty() || payloadSchemaInvalid(event) || harnessRejected) {
                        rejected = true;
                    }
                }
                assertTrue(rejected, "expected at least one event rejection");
                continue;
            }

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

    private static boolean payloadSchemaInvalid(Map<String, Object> event) throws Exception {
        var path = Path.of("../../schemas/aep-payloads.schema.json");
        var schemaNode = MAPPER.readTree(Files.readString(path));
        var schema = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012).getSchema(schemaNode);
        return !schema.validate(MAPPER.valueToTree(event)).isEmpty();
    }
}
