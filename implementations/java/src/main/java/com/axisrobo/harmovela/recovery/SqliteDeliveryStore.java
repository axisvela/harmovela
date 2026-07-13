package com.axisrobo.harmovela.recovery;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.*;
import java.time.Instant;
import java.util.*;

public class SqliteDeliveryStore implements DeliveryStore {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String streamId;
    private final Connection conn;
    private int sequence;

    public SqliteDeliveryStore(String url) throws SQLException {
        this(url, "stream_01");
    }

    public SqliteDeliveryStore(String url, String streamId) throws SQLException {
        this.streamId = streamId;
        this.conn = DriverManager.getConnection(url);
        initSchema();
    }

    private void initSchema() throws SQLException {
        try (var stmt = conn.createStatement()) {
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_pending (
                    event_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    cursor TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 1,
                    first_attempt_at TEXT NOT NULL,
                    last_attempt_at TEXT NOT NULL
                )
                """);
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_acked (
                    event_id TEXT PRIMARY KEY,
                    cursor TEXT NOT NULL,
                    acked_at TEXT NOT NULL
                )
                """);
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_dead_lettered (
                    event_id TEXT PRIMARY KEY,
                    subscription_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    cursor TEXT NOT NULL,
                    attempts INTEGER NOT NULL,
                    last_attempt_at TEXT NOT NULL,
                    reason TEXT NOT NULL DEFAULT '{}',
                    dead_lettered_at TEXT NOT NULL
                )
                """);
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """);
            stmt.execute("""
                CREATE TABLE IF NOT EXISTS delivery_subscriptions (
                    id TEXT PRIMARY KEY,
                    filter TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """);
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
                "INSERT INTO delivery_pending (event_id, subscription_id, seq, cursor, attempts, first_attempt_at, last_attempt_at) VALUES (?,?,?,?,1,?,?)")) {
            stmt.setString(1, eventId);
            stmt.setString(2, subscriptionId);
            stmt.setInt(3, seq);
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
            try (var stmt = conn.prepareStatement("DELETE FROM delivery_pending WHERE event_id = ?")) {
                stmt.setString(1, eventId);
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO delivery_acked (event_id, cursor, acked_at) VALUES (?,?,?)")) {
                stmt.setString(1, eventId);
                stmt.setString(2, entry.get("cursor"));
                stmt.setString(3, Instant.now().toString());
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT OR REPLACE INTO delivery_meta (key, value) VALUES ('last_ack_cursor', ?)")) {
                stmt.setString(1, entry.get("cursor"));
                stmt.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("ack failed", e);
        }
        return true;
    }

    public Object nack(String eventId) {
        var entry = getPendingEntry(eventId);
        if (entry == null) return false;
        var attempts = Integer.parseInt(entry.get("attempts")) + 1;
        var now = Instant.now().toString();
        try (var stmt = conn.prepareStatement(
                "UPDATE delivery_pending SET attempts = ?, last_attempt_at = ? WHERE event_id = ?")) {
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
        try {
            try (var stmt = conn.prepareStatement("DELETE FROM delivery_pending WHERE event_id = ?")) {
                stmt.setString(1, eventId);
                stmt.executeUpdate();
            }
            try (var stmt = conn.prepareStatement(
                    "INSERT INTO delivery_dead_lettered (event_id, subscription_id, seq, cursor, attempts, last_attempt_at, reason, dead_lettered_at) VALUES (?,?,?,?,?,?,?,?)")) {
                stmt.setString(1, eventId);
                stmt.setString(2, entry.get("subscription_id"));
                stmt.setInt(3, Integer.parseInt(entry.get("seq")));
                stmt.setString(4, entry.get("cursor"));
                stmt.setInt(5, Integer.parseInt(entry.get("attempts")));
                stmt.setString(6, entry.get("last_attempt_at"));
                stmt.setString(7, MAPPER.writeValueAsString(reason));
                stmt.setString(8, now);
                stmt.executeUpdate();
            }
        } catch (SQLException e) {
            throw new RuntimeException("deadLetter failed", e);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new RuntimeException("deadLetter reason serialize failed", e);
        }
        var payload = new LinkedHashMap<String, Object>();
        payload.put("original_event_id", eventId);
        payload.put("subscription_id", entry.get("subscription_id"));
        payload.put("cursor", entry.get("cursor"));
        payload.put("attempts", Integer.parseInt(entry.get("attempts")));
        payload.put("last_attempt_at", entry.get("last_attempt_at"));
        payload.put("error", reason.get("error"));
        return Map.of(
            "type", "event.dead_lettered",
            "payload", payload
        );
    }

    public List<Map<String, Object>> getPending() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.createStatement();
             var rs = stmt.executeQuery("SELECT * FROM delivery_pending ORDER BY seq")) {
            while (rs.next()) {
                result.add(rowToPendingMap(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("getPending failed", e);
        }
        return result;
    }

    public List<Map<String, Object>> getPendingForSubscription(String subscriptionId) {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement(
                "SELECT * FROM delivery_pending WHERE subscription_id = ? ORDER BY seq")) {
            stmt.setString(1, subscriptionId);
            try (var rs = stmt.executeQuery()) {
                while (rs.next()) {
                    result.add(rowToPendingMap(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("getPendingForSubscription failed", e);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getDeadLettered() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement(
                "SELECT event_id, subscription_id, reason FROM delivery_dead_lettered ORDER BY seq");
             var rs = stmt.executeQuery()) {
            while (rs.next()) {
                var record = new LinkedHashMap<String, Object>();
                record.put("eventId", rs.getString("event_id"));
                record.put("subscriptionId", rs.getString("subscription_id"));
                record.put("reason", MAPPER.readValue(rs.getString("reason"), Map.class));
                result.add(record);
            }
        } catch (Exception e) {
            throw new RuntimeException("getDeadLettered failed", e);
        }
        return result;
    }

    public boolean isAcknowledged(String eventId) {
        try (var stmt = conn.prepareStatement("SELECT 1 FROM delivery_acked WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            throw new RuntimeException("isAcknowledged failed", e);
        }
    }

    public boolean isPending(String eventId) {
        try (var stmt = conn.prepareStatement("SELECT 1 FROM delivery_pending WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            throw new RuntimeException("isPending failed", e);
        }
    }

    public boolean hasAttemptsRemaining(String eventId, int maxAttempts) {
        try (var stmt = conn.prepareStatement(
                "SELECT attempts FROM delivery_pending WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                return rs.next() && rs.getInt("attempts") < maxAttempts;
            }
        } catch (SQLException e) {
            throw new RuntimeException("hasAttemptsRemaining failed", e);
        }
    }

    public Map<String, Object> getStats() {
        try (var stmt = conn.createStatement()) {
            var pending = count(stmt, "delivery_pending");
            var acked = count(stmt, "delivery_acked");
            var dlq = count(stmt, "delivery_dead_lettered");
            var lastCursor = getMeta("last_ack_cursor");
            return Map.of(
                "totalSequences", sequence,
                "pending", pending,
                "acknowledged", acked,
                "deadLettered", dlq,
                "lastAckCursor", lastCursor
            );
        } catch (SQLException e) {
            throw new RuntimeException("getStats failed", e);
        }
    }

    public void close() throws SQLException {
        conn.close();
    }

    private Map<String, String> getPendingEntry(String eventId) {
        try (var stmt = conn.prepareStatement(
                "SELECT * FROM delivery_pending WHERE event_id = ?")) {
            stmt.setString(1, eventId);
            try (var rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                var map = new LinkedHashMap<String, String>();
                map.put("cursor", rs.getString("cursor"));
                map.put("subscription_id", rs.getString("subscription_id"));
                map.put("seq", String.valueOf(rs.getInt("seq")));
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
        map.put("sequence", rs.getInt("seq"));
        map.put("cursor", rs.getString("cursor"));
        map.put("attempts", rs.getInt("attempts"));
        map.put("firstAttemptAt", rs.getString("first_attempt_at"));
        map.put("lastAttemptAt", rs.getString("last_attempt_at"));
        return map;
    }

    private int count(Statement stmt, String table) throws SQLException {
        try (var rs = stmt.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    private String getMeta(String key) throws SQLException {
        try (var stmt = conn.prepareStatement("SELECT value FROM delivery_meta WHERE key = ?")) {
            stmt.setString(1, key);
            try (var rs = stmt.executeQuery()) {
                return rs.next() ? rs.getString("value") : null;
            }
        }
    }

    public Map<String, Object> createSubscription(Map<String, Object> record) {
        try (var stmt = conn.prepareStatement(
                "INSERT OR REPLACE INTO delivery_subscriptions (id, filter, created_at) VALUES (?,?,?)")) {
            stmt.setString(1, (String) record.get("id"));
            stmt.setString(2, MAPPER.writeValueAsString(record.get("filter")));
            stmt.setString(3, (String) record.get("created_at"));
            stmt.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException("createSubscription failed", e);
        }
        return record;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSubscription(String id) {
        try (var stmt = conn.prepareStatement("SELECT id, filter, created_at FROM delivery_subscriptions WHERE id = ?")) {
            stmt.setString(1, id);
            try (var rs = stmt.executeQuery()) {
                if (!rs.next()) return null;
                return Map.of(
                    "id", rs.getString("id"),
                    "filter", MAPPER.readValue(rs.getString("filter"), Map.class),
                    "created_at", rs.getString("created_at"));
            }
        } catch (Exception e) {
            throw new RuntimeException("getSubscription failed", e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listSubscriptions() {
        var result = new ArrayList<Map<String, Object>>();
        try (var stmt = conn.prepareStatement("SELECT id, filter, created_at FROM delivery_subscriptions ORDER BY created_at");
             var rs = stmt.executeQuery()) {
            while (rs.next()) {
                result.add(Map.of(
                    "id", rs.getString("id"),
                    "filter", MAPPER.readValue(rs.getString("filter"), Map.class),
                    "created_at", rs.getString("created_at")));
            }
        } catch (Exception e) {
            throw new RuntimeException("listSubscriptions failed", e);
        }
        return result;
    }

    public boolean deleteSubscription(String id) {
        try (var stmt = conn.prepareStatement("DELETE FROM delivery_subscriptions WHERE id = ?")) {
            stmt.setString(1, id);
            return stmt.executeUpdate() > 0;
        } catch (Exception e) {
            throw new RuntimeException("deleteSubscription failed", e);
        }
    }
}
