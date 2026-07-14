package com.axisrobo.harmovela.runtime;

import com.axisrobo.harmovela.recovery.DeliveryStore;
import com.axisrobo.harmovela.recovery.InMemoryDeliveryStore;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class ConfigTest {
    @Test
    void defaultConfigHasApiTransport() {
        var c = Config.defaultConfig();
        assertEquals("0.2", c.aepVersion());
        assertEquals(8790, c.api().port());
        assertEquals("sqlite", c.delivery().store());
    }

    @Test
    void applyEnvOverrides() {
        var c = Config.applyEnvOverrides(Config.defaultConfig(), Map.of(
            "AEPD_API_PORT", "9003",
            "AEP_POSTGRES_URL", "postgres://example/db"
        ));
        assertEquals(9003, c.api().port());
        assertEquals("postgres://example/db", c.delivery().postgresUrl());
    }

    @Test
    void writeAndLoad(@org.junit.jupiter.api.io.TempDir Path dir) throws Exception {
        var path = dir.resolve("harmovela.config.json");
        Config.writeDefaultConfig(path.toString());
        var loaded = Config.load(path.toString(), Map.of());
        assertEquals("runtime:aepd", loaded.runtimeSource());
    }

    @Test
    void createDeliveryStoreMemory() {
        DeliveryStore store = Config.createDeliveryStore(Config.defaultConfig().withStore("memory"));
        assertInstanceOf(InMemoryDeliveryStore.class, store);
    }
}
