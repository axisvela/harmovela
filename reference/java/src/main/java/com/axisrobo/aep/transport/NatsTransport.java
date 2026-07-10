package com.axisrobo.aep.transport;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class NatsTransport {

    private final ObjectMapper mapper;
    private final String url;
    private final String prefix;
    private boolean started;

    // io.nats.client.Connection - requires jnats on classpath at runtime
    private Object connection;
    private Object subscription;

    private Consumer<Map<String, Object>> messageHandler;
    private Consumer<Exception> errorHandler;

    public NatsTransport() {
        this("nats://localhost:4222", "aep");
    }

    public NatsTransport(String url, String prefix) {
        this.url = url;
        this.prefix = prefix;
        this.mapper = new ObjectMapper();
    }

    public boolean isConnected() {
        return connection != null && started;
    }

    public String getUrl() {
        return url;
    }

    public String getPrefix() {
        return prefix;
    }

    public void onMessage(Consumer<Map<String, Object>> handler) {
        this.messageHandler = handler;
    }

    public void onError(Consumer<Exception> handler) {
        this.errorHandler = handler;
    }

    public void start() throws Exception {
        if (started) {
            return;
        }
        try {
            var natsClass = Class.forName("io.nats.client.Nats");
            var connectMethod = natsClass.getMethod("connect", String.class);
            connection = connectMethod.invoke(null, url);

            var subscribeMethod = connection.getClass().getMethod("subscribe", String.class);
            subscription = subscribeMethod.invoke(connection, prefix + ".>");

            started = true;
        } catch (ClassNotFoundException e) {
            throw new RuntimeException("jnats client not on classpath. Add io.nats:jnats dependency.", e);
        }
    }

    public void stop() throws Exception {
        if (subscription != null) {
            subscription.getClass().getMethod("unsubscribe").invoke(subscription);
            subscription = null;
        }
        if (connection != null) {
            connection.getClass().getMethod("drain").invoke(connection);
            connection.getClass().getMethod("close").invoke(connection);
            connection = null;
        }
        started = false;
    }

    public void send(Map<String, Object> event) throws IOException {
        if (connection == null) {
            throw new IllegalStateException("not connected");
        }
        var subject = eventSubject(event);
        var json = mapper.writeValueAsString(event);
        var data = json.getBytes(StandardCharsets.UTF_8);

        try {
            var publishMethod = connection.getClass().getMethod("publish", String.class, byte[].class);
            publishMethod.invoke(connection, subject, data);
        } catch (Exception e) {
            if (e instanceof IOException) {
                throw (IOException) e;
            }
            throw new IOException("failed to publish", e);
        }
    }

    public String eventSubject(Map<String, Object> event) {
        var topic = (String) event.get("topic");
        if (topic != null && !topic.isEmpty()) {
            return prefix + ".topic." + topic;
        }
        var type = (String) event.get("type");
        if (type != null && !type.isEmpty()) {
            return prefix + ".type." + type;
        }
        var source = (String) event.get("source");
        if (source != null && !source.isEmpty()) {
            return prefix + ".source." + source;
        }
        return prefix + ".event";
    }

    public List<String> subscriptionSubjects(List<String> patterns, String sessionId) {
        var subjects = new ArrayList<String>();
        for (var p : patterns) {
            if ("*".equals(p)) {
                subjects.add(prefix + ".>");
            } else {
                subjects.add(prefix + ".type." + p.replace("*", ">"));
            }
        }
        if (sessionId != null && !sessionId.isEmpty()) {
            subjects.add(prefix + ".sess." + sessionId);
        }
        return subjects;
    }
}
