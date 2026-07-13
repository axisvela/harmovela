package com.axisrobo.aep.runtime;

import com.axisrobo.harmovela.recovery.DeliveryStore;
import com.axisrobo.harmovela.recovery.InMemoryDeliveryStore;
import com.axisrobo.harmovela.recovery.SqliteDeliveryStore;
import com.axisrobo.harmovela.recovery.PostgresDeliveryStore;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public class Config {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record Transport(boolean enabled, String host, int port, String path) {}

    public record Delivery(String store, String sqlitePath, String postgresUrl) {}

    private String aepVersion = "0.2";
    private String runtimeId = "aepd-local";
    private String runtimeSource = "runtime:aepd";
    private Transport websocket = new Transport(true, "127.0.0.1", 8787, "/harmovela");
    private Transport sse = new Transport(true, "127.0.0.1", 8788, "/harmovela/events");
    private Transport api = new Transport(true, "127.0.0.1", 8790, "/harmovela/api");
    private String deliveryStore = "sqlite";
    private String sqlitePath = ".harmovela/harmovela.sqlite";
    private String postgresUrl = "postgres://postgres:postgres@localhost:5433/postgres";

    public static Config defaultConfig() {
        return new Config();
    }

    public String aepVersion() { return aepVersion; }
    public String runtimeId() { return runtimeId; }
    public String runtimeSource() { return runtimeSource; }
    public Transport websocket() { return websocket; }
    public Transport sse() { return sse; }
    public Transport api() { return api; }
    public Delivery delivery() { return new Delivery(deliveryStore, sqlitePath, postgresUrl); }

    public Config withStore(String store) {
        this.deliveryStore = store;
        return this;
    }

    public Config withApi(Transport t) {
        this.api = t;
        return this;
    }

    public Config withWebsocketEnabled(boolean enabled) {
        this.websocket = new Transport(enabled, websocket.host(), websocket.port(), websocket.path());
        return this;
    }

    public Config withSseEnabled(boolean enabled) {
        this.sse = new Transport(enabled, sse.host(), sse.port(), sse.path());
        return this;
    }

    public static void writeDefaultConfig(String path) throws Exception {
        var p = Path.of(path);
        if (p.getParent() != null) Files.createDirectories(p.getParent());
        Files.writeString(p, MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(defaultConfig().toMap()) + "\n");
    }

    public Map<String, Object> toMap() {
        return Map.of(
            "spec_version", aepVersion,
            "runtime", Map.of("id", runtimeId, "source", runtimeSource),
            "transports", Map.of(
                "websocket", transportMap(websocket),
                "sse", transportMap(sse),
                "api", transportMap(api),
                "stdio", Map.of("enabled", false)
            ),
            "delivery", Map.of(
                "store", deliveryStore,
                "sqlite", Map.of("path", sqlitePath),
                "postgres", Map.of("url", postgresUrl)
            )
        );
    }

    private static Map<String, Object> transportMap(Transport t) {
        return Map.of("enabled", t.enabled(), "host", t.host(), "port", t.port(), "path", t.path());
    }

    @SuppressWarnings("unchecked")
    public static Config load(String path, Map<String, String> env) throws Exception {
        var raw = Files.readString(Path.of(path));
        var parsed = (Map<String, Object>) MAPPER.readValue(raw, Map.class);
        var c = new Config();
        c.aepVersion = (String) parsed.getOrDefault("spec_version", "0.2");
        var runtime = (Map<String, Object>) parsed.getOrDefault("runtime", Map.of());
        c.runtimeId = (String) runtime.getOrDefault("id", "aepd-local");
        c.runtimeSource = (String) runtime.getOrDefault("source", "runtime:aepd");
        var transports = (Map<String, Object>) parsed.getOrDefault("transports", Map.of());
        c.websocket = readTransport(transports, "websocket", c.websocket);
        c.sse = readTransport(transports, "sse", c.sse);
        c.api = readTransport(transports, "api", c.api);
        var delivery = (Map<String, Object>) parsed.getOrDefault("delivery", Map.of());
        c.deliveryStore = (String) delivery.getOrDefault("store", "sqlite");
        var sqlite = (Map<String, Object>) delivery.getOrDefault("sqlite", Map.of());
        c.sqlitePath = (String) sqlite.getOrDefault("path", ".harmovela/harmovela.sqlite");
        var postgres = (Map<String, Object>) delivery.getOrDefault("postgres", Map.of());
        c.postgresUrl = (String) postgres.getOrDefault("url", c.postgresUrl);
        return applyEnvOverrides(c, env);
    }

    @SuppressWarnings("unchecked")
    private static Transport readTransport(Map<String, Object> transports, String key, Transport fallback) {
        var t = (Map<String, Object>) transports.get(key);
        if (t == null) return fallback;
        return new Transport(
            (boolean) t.getOrDefault("enabled", fallback.enabled()),
            (String) t.getOrDefault("host", fallback.host()),
            ((Number) t.getOrDefault("port", fallback.port())).intValue(),
            (String) t.getOrDefault("path", fallback.path())
        );
    }

    public static Config applyEnvOverrides(Config c, Map<String, String> env) {
        String host = env.get("AEPD_HOST");
        if (host != null && !host.isEmpty()) {
            c.websocket = new Transport(c.websocket.enabled(), host, c.websocket.port(), c.websocket.path());
            c.sse = new Transport(c.sse.enabled(), host, c.sse.port(), c.sse.path());
            c.api = new Transport(c.api.enabled(), host, c.api.port(), c.api.path());
        }
        String wsPort = env.get("AEPD_WS_PORT");
        if (wsPort != null && !wsPort.isEmpty()) {
            c.websocket = new Transport(c.websocket.enabled(), c.websocket.host(), Integer.parseInt(wsPort), c.websocket.path());
        }
        String ssePort = env.get("AEPD_SSE_PORT");
        if (ssePort != null && !ssePort.isEmpty()) {
            c.sse = new Transport(c.sse.enabled(), c.sse.host(), Integer.parseInt(ssePort), c.sse.path());
        }
        String apiPort = env.get("AEPD_API_PORT");
        if (apiPort != null && !apiPort.isEmpty()) {
            c.api = new Transport(c.api.enabled(), c.api.host(), Integer.parseInt(apiPort), c.api.path());
        }
        String pg = env.get("AEP_POSTGRES_URL");
        if (pg != null && !pg.isEmpty()) {
            c.postgresUrl = pg;
        }
        return c;
    }

    public static DeliveryStore createDeliveryStore(Config c) {
        try {
            switch (c.deliveryStore) {
                case "memory":
                    return new InMemoryDeliveryStore();
                case "sqlite": {
                    var path = (c.sqlitePath == null || c.sqlitePath.isEmpty()) ? ":memory:" : c.sqlitePath;
                    return new SqliteDeliveryStore("jdbc:sqlite:" + path);
                }
                case "postgres":
                    return new PostgresDeliveryStore(
                        "jdbc:postgresql://localhost:5433/postgres?user=postgres&password=postgres",
                        "stream_01", "delivery", false);
                default:
                    throw new IllegalArgumentException("unsupported delivery store: " + c.deliveryStore);
            }
        } catch (Exception e) {
            throw new RuntimeException("createDeliveryStore failed", e);
        }
    }
}
