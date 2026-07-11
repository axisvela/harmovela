package com.axisrobo.aep;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.*;
import java.time.Instant;
import java.util.*;

public class PostgresDeliveryStore implements DeliveryStore {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String streamId;
    private final String prefix;
    private final boolean dropOnClose;
    private final Connection conn;
    private int sequence;
    private String lastAckCursor;

    public PostgresDeliveryStore(String url, String streamId, String tablePrefix, boolean dropOnClose)
            throws SQLException {
        this.streamId = streamId == null || streamId.isEmpty() ? "stream_01" : streamId;
        this.prefix = tablePrefix == null || tablePrefix.isEmpty() ? "delivery" : tablePrefix;
        this.dropOnClose = dropOnClose;
        this.conn = DriverManager.getConnection(url);
        initSchema();
    }

    private String t(String name) {
        return prefix + "_" + name;
    }

    private void initSchema() throws SQLException {
        try (var stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("meta") + " ("
                + "key TEXT PRIMARY KEY, value TEXT NOT NULL)");
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("pending") + " ("
                + "event_id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL, seq BIGINT NOT NULL, "
                + "cursor TEXT NOT NULL, attempts INT NOT NULL DEFAULT 1, "
                + "first_attempt_at TEXT NOT NULL, last_attempt_at TEXT NOT NULL)");
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("acked") + " ("
                + "event_id TEXT PRIMARY KEY, cursor TEXT NOT NULL, acked_at TEXT NOT NULL)");
            stmt.execute("CREATE TABLE IF NOT EXISTS " + t("dead_lettered") + " ("
                + "event_id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL, seq BIGINT NOT NULL, "
                + "cursor TEXT NOT NULL, attempts INT NOT NULL, last_attempt_at TEXT NOT NULL, "
                + "reason JSONB NOT NULL DEFAULT '{}', dead_lettered_at TEXT NOT NULL)");
        }
    }

    public int nextSequence() {
        return ++sequence;
    }

    public int track(String eventId, String subscriptionId) {
        var seq = nextSequence();
        var now = Instant.now().toString();
        var cursor = streamId + ":" + seq;
        try (var stmt = conn.prepareStatement(
                "INSERT INTO " + t("pending") + " (event_id, subscription_id, seq, cursor, attempts, "
                + "first_attempt_at, last_attempt_at) VALUES (?,?,?,?,1,?,?) "
                + "ON CONFLICT (event_id) DO UPDATE SET subscription_id=EXCLUDED.subscription_id, "
                + "seq=EXCLUDED.seq, cursor=EXCLUDED.cursor, attempts=1, "
                + "first_attempt_at=EXCLUDED.first_attempt_at, last_attempt_at=EXCLUDED.last_attempt_at")) {
            stmt.setString(1, eventId);
            stmt.setString(2, subscriptionId);
            stmt.setLong(3, seq);
            stmt.setString(4, cursor);
            stmt.setString(5, now);
            stmt.setString(6, now);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("track failed", e);
        }
        return seq;
    }

    public boolean ack(String eventId) {
        var entry = getPendingEntry(eventId);
        if (entry == null) return false;
        try {
            try (var stmt = conn.prepareStatement("DELETE FROM " + t("pending") + " WHERE event_id = ?")) {
                stmt.setString(1, eventId);
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO " + t("acked") + " (event_id, cursor, acked_at) VALUES (?,?,?) "
                    + "ON CONFLICT (event_id) DO UPDATE SET cursor=EXCLUDED.cursor, acked_at=EXCLUDED.acked_at")) {
                stmt.setString(1, eventId);
                stmt.setString(2, entry.get("cursor"));
                stmt.setString(3, Instant.now().toString());
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO " + t("meta") + " (key, value) VALUES ('last_ack_cursor', ?) "
                    + "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value")) {
                stmt.setString(1, entry.get("cursor"));
                stmt.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("ack failed", e);
        }
        lastAckCursor = entry.get("cursor");
        return true;
    }

    public Object nack(String eventId) {
        var entry = getPendingEntry(eventId);
        if (entry == null) return false;
        var attempts = Integer.parseInt(entry.get("attempts")) + 1;
        var now = Instant.now().toString();
        try (var stmt = conn.prepareStatement(
                "UPDATE " + t("pending") + " SET attempts = ?, last_attempt_at = ? WHERE event_id = ?")) {
            stmt.setInt(1, attempts);
            stmt.setString(2, now);
            stmt.setString(3, eventId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("nack failed", e);
        }
        return attempts;
    }

    public Map<String, Object> deadLetter(String eventId, Map<String, Object> reason) {
        var entry = getPendingEntry(eventId);
        if (entry == null) return null;
        if (reason == null) reason = Map.of();
        var now = Instant.now().toString();
        String reasonJson;
        try {
            reasonJson = MAPPER.writeValueAsString(reason);
        } catch (Exception e) {
            throw new RuntimeException("reason serialize failed", e);
        }
        try {
            try (var stmt = conn.prepareStatement("DELETE FROM " + t("pending") + " WHERE event_id = ?")) {
                stmt.setString(1, eventId);
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO " + t("dead_lettered") + " (event_id, subscription_id, seq, cursor, "
                    + "attempts, last_attempt_at, reason, dead_lettered_at) VALUES (?,?,?,?,?,?,?::jsonb,?) "
                    + "ON CONFLICT (event_id) DO NOTHING")) {
                stmt.setString(1, eventId);
                stmt.setString(2, entry.get("subscription_id"));
                stmt.setLong(3, Long.parseLong(entry.get("seq")));
                stmt.setString(4, entry.get("cursor"));
                stmt.setInt(5, Integer.parseInt(entry.get("attempts")));
                stmt.setString(6, entry.get("last_attempt_at"));
                stmt.setString(7, reasonJson);
                stmt.setString(8, now);
                stmt.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("deadLetter failed", e);
        }
        var payload = new LinkedHashMap<String, Object>();
        payload.put("original_event_id", eventId);
        payload.put("subscription_id", entry.get("subscription_id"));
        payload.put("cursor", entry.get("cursor"));
        payload.put("attempts", Integer.parseInt(entry.get("attempts")));
        payload.put("last_attempt_at", entry.get("last_attempt_at"));
        payload.put("error", reason.get("error"));
        return Map.of("type", "event.dead_lettered", "payload", payload);
    }

    public List<Map<String, Object>> getPending() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement("SELECT * FROM " + t("pending") + " ORDER BY seq");
             var rs = stmt.executeQuery()) {
            while (rs.next()) result.add(rowToPendingMap(rs));
        } catch (SQLException e) {
            throw new RuntimeException("getPending failed", e);
        }
        return result;
    }

    public List<Map<String, Object>> getPendingForSubscription(String subscriptionId) {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement(
                "SELECT * FROM " + t("pending") + " WHERE subscription_id = ? ORDER BY seq")) {
            stmt.setString(1, subscriptionId);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) result.add(rowToPendingMap(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("getPendingForSubscription failed", e);
        }
        return result;
    }

    public boolean isAcknowledged(String eventId) {
        return exists(t("acked"), eventId);
    }

    public boolean isPending(String eventId) {
        return exists(t("pending"), eventId);
    }

    public boolean hasAttemptsRemaining(String eventId, int maxAttempts) {
        try (var stmt = conn.prepareStatement(
                "SELECT attempts FROM " + t("pending") + " WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next() && rs.getInt("attempts") < maxAttempts;
            }
        } catch (SQLException e) {
            throw new RuntimeException("hasAttemptsRemaining failed", e);
        }
    }

    public Map<String, Object> getStats() {
        var pending = count(t("pending"));
        var acked = count(t("acked"));
        var dlq = count(t("dead_lettered"));
        var stats = new LinkedHashMap<String, Object>();
        stats.put("totalSequences", sequence);
        stats.put("pending", pending);
        stats.put("acknowledged", acked);
        stats.put("deadLettered", dlq);
        stats.put("lastAckCursor", lastAckCursor);
        return stats;
    }

    public void close() throws SQLException {
        if (dropOnClose) {
            try (var stmt = conn.createStatement()) {
                stmt.execute("DROP TABLE IF EXISTS " + t("meta") + ", " + t("pending") + ", "
                    + t("acked") + ", " + t("dead_lettered"));
            }
        }
        conn.close();
    }

    private boolean exists(String table, String eventId) {
        try (var stmt = conn.prepareStatement("SELECT 1 FROM " + table + " WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            throw new RuntimeException("exists failed", e);
        }
    }

    private int count(String table) {
        try (var stmt = conn.prepareStatement("SELECT COUNT(*) FROM " + table);
             var rs = stmt.executeQuery()) {
            return rs.next() ? rs.getInt(1) : 0;
        } catch (SQLException e) {
            throw new RuntimeException("count failed", e);
        }
    }

    private Map<String, String> getPendingEntry(String eventId) {
        try (var stmt = conn.prepareStatement("SELECT * FROM " + t("pending") + " WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                var map = new LinkedHashMap<String, String>();
                map.put("cursor", rs.getString("cursor"));
                map.put("subscription_id", rs.getString("subscription_id"));
                map.put("seq", String.valueOf(rs.getLong("seq")));
                map.put("attempts", String.valueOf(rs.getInt("attempts")));
                map.put("last_attempt_at", rs.getString("last_attempt_at"));
                return map;
            }
        } catch (SQLException e) {
            throw new RuntimeException("getPendingEntry failed", e);
        }
    }

    private Map<String, Object> rowToPendingMap(ResultSet rs) throws SQLException {
        var map = new LinkedHashMap<String, Object>();
        map.put("eventId", rs.getString("event_id"));
        map.put("subscriptionId", rs.getString("subscription_id"));
        map.put("sequence", (int) rs.getLong("seq"));
        map.put("cursor", rs.getString("cursor"));
        map.put("attempts", rs.getInt("attempts"));
        map.put("firstAttemptAt", rs.getString("first_attempt_at"));
        map.put("lastAttemptAt", rs.getString("last_attempt_at"));
        return map;
    }
}
