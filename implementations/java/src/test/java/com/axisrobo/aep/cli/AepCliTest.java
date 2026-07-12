package com.axisrobo.aep.cli;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class AepCliTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void initWritesConfig(@TempDir Path dir) throws Exception {
        var path = dir.resolve("harmovela.config.json");
        int code = AepCli.run(new String[]{"init", "--config", path.toString()});
        assertEquals(0, code);
        var parsed = MAPPER.readValue(Files.readString(path), Map.class);
        var runtime = (Map<?, ?>) parsed.get("runtime");
        assertEquals("aepd-local", runtime.get("id"));
    }
}
