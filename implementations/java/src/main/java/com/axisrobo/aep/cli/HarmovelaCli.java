package com.axisrobo.aep.cli;

import com.axisrobo.aep.DeliveryStore;
import com.axisrobo.aep.Subscriptions;
import com.axisrobo.aep.runtime.HarmovelaRuntimeService;
import com.axisrobo.aep.runtime.Config;
import com.axisrobo.aep.transport.WsClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Command(name = "aep", description = "Agent Event Protocol CLI",
    subcommands = {HarmovelaCli.Init.class, HarmovelaCli.Start.class, HarmovelaCli.Status.class,
                   HarmovelaCli.Emit.class, HarmovelaCli.Subscribe.class, HarmovelaCli.Dlq.class,
                   HarmovelaCli.Conformance.class, HarmovelaCli.SubscriptionsGroup.class})
public class HarmovelaCli implements Runnable {
    static final ObjectMapper MAPPER = new ObjectMapper();

    public void run() {
        new CommandLine(this).usage(System.out);
    }

    public static int run(String[] args) {
        return new CommandLine(new HarmovelaCli()).execute(args);
    }

    public static void main(String[] args) {
        System.exit(run(args));
    }

    @Command(name = "init", description = "Create a Harmovela runtime config file")
    static class Init implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--config", defaultValue = "harmovela.config.json") String config;
        public Integer call() throws Exception {
            Config.writeDefaultConfig(config);
            System.out.println("created " + config);
            return 0;
        }
    }

    @Command(name = "start", description = "Start the local aepd runtime daemon")
    static class Start implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--config", defaultValue = "harmovela.config.json") String config;
        public Integer call() throws Exception {
            var c = Config.load(config, System.getenv());
            var svc = new HarmovelaRuntimeService(c);
            svc.start();
            System.out.println("aepd started api=" + svc.apiPort());
            Thread.currentThread().join();
            return 0;
        }
    }

    @Command(name = "status", description = "Query an aepd health endpoint")
    static class Status implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--url", defaultValue = "http://127.0.0.1:8790/harmovela/api/healthz") String url;
        public Integer call() throws Exception {
            var client = HttpClient.newHttpClient();
            var resp = client.send(HttpRequest.newBuilder(URI.create(url)).build(),
                HttpResponse.BodyHandlers.ofString());
            System.out.println(resp.body());
            return 0;
        }
    }

    @Command(name = "emit", description = "Emit one AEP event over WebSocket")
    static class Emit implements java.util.concurrent.Callable<Integer> {
        @Parameters(index = "0") String type;
        @Option(names = "--payload", defaultValue = "{}") String payload;
        @Option(names = "--url", defaultValue = "ws://127.0.0.1:8787/harmovela") String url;
        @Option(names = "--id") String id;
        @Option(names = "--source", defaultValue = "cli:aep") String source;
        @SuppressWarnings("unchecked")
        public Integer call() throws Exception {
            Map<String, Object> parsed;
            try {
                parsed = (Map<String, Object>) MAPPER.readValue(payload, Map.class);
            } catch (Exception e) {
                System.err.println("invalid JSON payload");
                return 1;
            }
            var event = Map.of(
                "spec_version", "0.2",
                "id", id != null ? id : "evt_" + UUID.randomUUID().toString().replace("-", ""),
                "type", type, "source", source,
                "created_at", Instant.now().toString(), "payload", parsed);
            var client = new WsClient(URI.create(url));
            client.connect();
            client.send(event);
            client.close();
            System.out.println(MAPPER.writeValueAsString(event));
            return 0;
        }
    }

    @Command(name = "subscribe", description = "Subscribe to AEP events over WebSocket")
    static class Subscribe implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--type", defaultValue = "*") String type;
        @Option(names = "--url", defaultValue = "ws://127.0.0.1:8787/harmovela") String url;
        public Integer call() throws Exception {
            var client = new WsClient(URI.create(url));
            client.onMessage(event -> {
                var t = (String) event.get("type");
                if (Subscriptions.matchesType(type, t)) {
                    try {
                        System.out.println(MAPPER.writeValueAsString(event));
                    } catch (Exception ignored) {}
                }
            });
            client.connect();
            Thread.currentThread().join();
            return 0;
        }
    }

    @Command(name = "dlq", description = "Inspect dead-lettered events")
    static class Dlq implements java.util.concurrent.Callable<Integer> {
        @Parameters(index = "0", defaultValue = "list") String subcommand;
        @Option(names = "--config", defaultValue = "harmovela.config.json") String config;
        public Integer call() throws Exception {
            if (!subcommand.equals("list")) {
                System.err.println("unsupported dlq command: " + subcommand);
                return 1;
            }
            var c = Config.load(config, System.getenv());
            DeliveryStore store = Config.createDeliveryStore(c);
            List<Map<String, Object>> records = store.getDeadLettered();
            var stats = store.getStats();
            System.out.println(MAPPER.writeValueAsString(Map.of(
                "deadLettered", stats.getOrDefault("deadLettered", records.size()),
                "records", records)));
            return 0;
        }
    }

    @Command(name = "conformance", description = "Run Harmovela conformance fixtures")
    static class Conformance implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--profile") String profile;
        public Integer call() throws Exception {
            List<String> cmd = new ArrayList<>();
            String mvnHome = System.getenv("MAVEN_HOME");
            String mvnPath = System.getenv("PATH");
            String mvn = "mvn";
            if (mvnHome != null && !mvnHome.isEmpty()) {
                mvn = mvnHome + File.separator + "bin" + File.separator + "mvn";
                if (System.getProperty("os.name").toLowerCase().contains("win")) {
                    mvn += ".cmd";
                }
            }
            try {
                new ProcessBuilder(mvn, "--version")
                    .redirectErrorStream(true)
                    .start()
                    .waitFor();
            } catch (Exception e) {
                System.out.println("SKIP maven not available");
                return 0;
            }
            cmd.add(mvn);
            cmd.add("test");
            cmd.add("-pl");
            cmd.add(".");
            cmd.add("-Dtest=ConformanceTest");
            cmd.add("-q");
            if (profile != null && !profile.isEmpty()) {
                cmd.add("-Dhv.profile=" + profile);
            }
            ProcessBuilder pb = new ProcessBuilder(cmd).inheritIO();
            int exit = pb.start().waitFor();
            return exit;
        }
    }

    @Command(name = "subscriptions", description = "Manage runtime subscriptions over HTTP",
        subcommands = {HarmovelaCli.SubscriptionsGroup.Create.class, HarmovelaCli.SubscriptionsGroup.ListSub.class,
                       HarmovelaCli.SubscriptionsGroup.Delete.class, HarmovelaCli.SubscriptionsGroup.Stream.class})
    static class SubscriptionsGroup implements java.util.concurrent.Callable<Integer> {
        static final HttpClient HTTP = HttpClient.newHttpClient();

        @Command(name = "create", description = "Create a subscription")
        static class Create implements java.util.concurrent.Callable<Integer> {
            @Option(names = "--filter", defaultValue = "{}") String filterText;
            @Option(names = "--base", defaultValue = "http://127.0.0.1:8790/harmovela/api") String base;
            @SuppressWarnings("unchecked")
            public Integer call() throws Exception {
                Map<String, Object> filter;
                try {
                    filter = (Map<String, Object>) MAPPER.readValue(filterText, Map.class);
                } catch (Exception e) {
                    System.err.println("invalid JSON filter");
                    return 1;
                }
                var body = MAPPER.writeValueAsString(Map.of("filter", filter));
                var req = HttpRequest.newBuilder(URI.create(base + "/subscriptions"))
                    .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
                var resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() != 201) {
                    System.err.println("request failed: HTTP " + resp.statusCode());
                    return 1;
                }
                System.out.println(resp.body());
                return 0;
            }
        }

        @Command(name = "list", description = "List subscriptions")
        static class ListSub implements java.util.concurrent.Callable<Integer> {
            @Option(names = "--base", defaultValue = "http://127.0.0.1:8790/harmovela/api") String base;
            public Integer call() throws Exception {
                var req = HttpRequest.newBuilder(URI.create(base + "/subscriptions")).build();
                var resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() != 200) {
                    System.err.println("request failed: HTTP " + resp.statusCode());
                    return 1;
                }
                System.out.println(resp.body());
                return 0;
            }
        }

        @Command(name = "delete", description = "Delete a subscription")
        static class Delete implements java.util.concurrent.Callable<Integer> {
            @Parameters(index = "0") String id;
            @Option(names = "--base", defaultValue = "http://127.0.0.1:8790/harmovela/api") String base;
            public Integer call() throws Exception {
                var req = HttpRequest.newBuilder(URI.create(base + "/subscriptions/" + id)).DELETE().build();
                var resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 404) {
                    System.err.println("not found");
                    return 1;
                }
                if (resp.statusCode() != 200) {
                    System.err.println("request failed: HTTP " + resp.statusCode());
                    return 1;
                }
                System.out.println(resp.body());
                return 0;
            }
        }

        @Command(name = "stream", description = "Stream events for a subscription")
        static class Stream implements java.util.concurrent.Callable<Integer> {
            @Parameters(index = "0") String id;
            @Option(names = "--base", defaultValue = "http://127.0.0.1:8790/harmovela/api") String base;
            public Integer call() throws Exception {
                var req = HttpRequest.newBuilder(URI.create(base + "/subscriptions/" + id + "/stream")).build();
                var resp = HTTP.send(req, HttpResponse.BodyHandlers.ofLines());
                if (resp.statusCode() == 404) {
                    System.err.println("not found");
                    return 1;
                }
                resp.body().forEach(line -> {
                    if (line.startsWith("data: ")) System.out.println(line.substring("data: ".length()));
                });
                return 0;
            }
        }

        public Integer call() { return 0; }
    }
}
