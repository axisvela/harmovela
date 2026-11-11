package com.axisvela.harmovela.client;

import com.axisvela.harmovela.event.envelope.Envelope;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public final class HarmovelaClient {
    public static final String DEFAULT_BASE_URL = "http://127.0.0.1:8790";
    public static final String DEFAULT_PATH = "/harmovela/api";

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final String baseUrl;
    private final String path;
    private final HttpClient http;
    private final Duration timeout;

    public HarmovelaClient() {
        this(DEFAULT_BASE_URL, DEFAULT_PATH);
    }

    public HarmovelaClient(String baseUrl) {
        this(baseUrl, DEFAULT_PATH);
    }

    public HarmovelaClient(String baseUrl, String path) {
        this(baseUrl, path, HttpClient.newHttpClient(), Duration.ofSeconds(30));
    }

    public HarmovelaClient(String baseUrl, String path, HttpClient http, Duration timeout) {
        this.baseUrl = (baseUrl == null || baseUrl.isEmpty() ? DEFAULT_BASE_URL : baseUrl)
                .replaceAll("/+$", "");
        this.path = normalizePath(path == null || path.isEmpty() ? DEFAULT_PATH : path);
        this.http = http;
        this.timeout = timeout;
    }

    public Map<String, Object> health() {
        return map("GET", "/healthz", null);
    }

    public Map<String, Object> publish(Map<String, Object> event) {
        var errors = Envelope.validate(event);
        if (!errors.isEmpty()) {
            throw new HarmovelaClientException(
                    "invalid Harmovela event: " + String.join("; ", errors), 0,
                    Map.of("accepted", false, "errors", errors));
        }
        return map("POST", "/events", event);
    }

    public Map<String, Object> stats() {
        return map("GET", "/stats", null);
    }

    public Map<String, Object> pending() {
        return map("GET", "/pending", null);
    }

    public Map<String, Object> deadLettered() {
        return map("GET", "/dlq", null);
    }

    public Map<String, Object> createSubscription(Map<String, Object> filter) {
        return map("POST", "/subscriptions", Map.of("filter", filter == null ? Map.of() : filter));
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listSubscriptions() {
        var body = map("GET", "/subscriptions", null);
        return (List<Map<String, Object>>) body.getOrDefault("subscriptions", List.of());
    }

    public Map<String, Object> getSubscription(String id) {
        return map("GET", "/subscriptions/" + encode(id), null);
    }

    public Map<String, Object> deleteSubscription(String id) {
        return map("DELETE", "/subscriptions/" + encode(id), null);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> poll(String id) {
        var body = map("GET", "/subscriptions/" + encode(id) + "/events", null);
        return (List<Map<String, Object>>) body.getOrDefault("events", List.of());
    }

    public void stream(String id, Consumer<Map<String, Object>> handler) {
        var request = HttpRequest.newBuilder(uri("/subscriptions/" + encode(id) + "/stream"))
                .timeout(timeout)
                .header("Accept", "text/event-stream")
                .GET()
                .build();
        try {
            var response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                var body = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
                throw new HarmovelaClientException(
                        "Harmovela HTTP " + response.statusCode() + ": " + bounded(body),
                        response.statusCode(), body);
            }
            try (var reader = new BufferedReader(
                    new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    var trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;
                    var payload = trimmed.substring(5).trim();
                    if (payload.isEmpty()) continue;
                    handler.accept(MAPPER.readValue(payload, MAP_TYPE));
                }
            }
        } catch (HarmovelaClientException error) {
            throw error;
        } catch (Exception error) {
            throw new HarmovelaClientException(
                    "Harmovela stream failed: " + error.getMessage(), 0, null);
        }
    }

    public Map<String, Object> request(String method, String route, Object body) {
        return map(method, route, body);
    }

    private Map<String, Object> map(String method, String route, Object body) {
        var builder = HttpRequest.newBuilder(uri(route))
                .timeout(timeout)
                .header("Accept", "application/json");
        if (body == null) {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            try {
                builder.header("Content-Type", "application/json")
                        .method(method, HttpRequest.BodyPublishers.ofString(
                                MAPPER.writeValueAsString(body)));
            } catch (Exception error) {
                throw new HarmovelaClientException(
                        "Harmovela request encode failed: " + error.getMessage(), 0, null);
            }
        }
        try {
            var response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            var text = response.body();
            Object parsed = null;
            if (text != null && !text.isEmpty()) {
                parsed = MAPPER.readValue(text, MAP_TYPE);
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new HarmovelaClientException(
                        "Harmovela HTTP " + response.statusCode() + ": " + bounded(text),
                        response.statusCode(), parsed);
            }
            return parsed == null ? Map.of() : MAPPER.convertValue(parsed, MAP_TYPE);
        } catch (HarmovelaClientException error) {
            throw error;
        } catch (Exception error) {
            throw new HarmovelaClientException(
                    "Harmovela request failed: " + error.getMessage(), 0, null);
        }
    }

    private URI uri(String route) {
        var suffix = route.startsWith("/") ? route : "/" + route;
        return URI.create(baseUrl + path + suffix);
    }

    private static String normalizePath(String value) {
        var path = value.startsWith("/") ? value : "/" + value;
        return path.replaceAll("/+$", "");
    }

    private static String encode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static String bounded(String value) {
        if (value == null) return "";
        return value.length() <= 512 ? value : value.substring(0, 512);
    }
}
