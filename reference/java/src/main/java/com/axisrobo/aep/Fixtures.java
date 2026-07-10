package com.axisrobo.aep;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

public final class Fixtures {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ManifestFixture(String path, String level, String description,
                                  String expectation, List<String> tags,
                                  @JsonProperty("expected_types") List<String> expectedTypes,
                                  @JsonProperty("expected_stats") Map<String, Object> expectedStats) {}

    public record Manifest(@JsonProperty("aep_version") String aep_version,
                           @JsonProperty("default_target_level") String default_target_level,
                           List<String> levels, List<ManifestFixture> fixtures) {}

    public static Manifest loadManifest(String path) throws IOException {
        return MAPPER.readValue(Path.of(path).toFile(), Manifest.class);
    }

    public static List<Map<String, Object>> loadFixture(String path) throws IOException {
        var text = Files.readString(Path.of(path));
        return Arrays.stream(text.strip().split("\n"))
            .filter(line -> !line.isBlank())
            .map(line -> {
                try {
                    return MAPPER.<Map<String, Object>>readValue(line, new TypeReference<>() {});
                } catch (IOException e) {
                    throw new RuntimeException("invalid NDJSON line", e);
                }
            })
            .collect(Collectors.toList());
    }
}
