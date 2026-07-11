package com.axisrobo.aep.cli;

import com.axisrobo.aep.DeliveryStore;
import com.axisrobo.aep.Subscriptions;
import com.axisrobo.aep.runtime.AepRuntimeService;
import com.axisrobo.aep.runtime.Config;
import com.axisrobo.aep.transport.WsClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Command(name = "aep", description = "Agent Event Protocol CLI",
    subcommands = {AepCli.Init.class, AepCli.Start.class, AepCli.Status.class,
                   AepCli.Emit.class, AepCli.Subscribe.class, AepCli.Dlq.class})
public class AepCli implements Runnable {
    static final ObjectMapper MAPPER = new ObjectMapper();

    public void run() {
        new CommandLine(this).usage(System.out);
    }

    public static int run(String[] args) {
        return new CommandLine(new AepCli()).execute(args);
    }

    public static void main(String[] args) {
        System.exit(run(args));
    }

    @Command(name = "init", description = "Create an AEP runtime config file")
    static class Init implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--config", defaultValue = "aep.config.json") String config;
        public Integer call() throws Exception {
            Config.writeDefaultConfig(config);
            System.out.println("created " + config);
            return 0;
        }
    }

    @Command(name = "start", description = "Start the local aepd runtime daemon")
    static class Start implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--config", defaultValue = "aep.config.json") String config;
        public Integer call() throws Exception {
            var c = Config.load(config, System.getenv());
            var svc = new AepRuntimeService(c);
            svc.start();
            System.out.println("aepd started api=" + svc.apiPort());
            Thread.currentThread().join();
            return 0;
        }
    }

    @Command(name = "status", description = "Query an aepd health endpoint")
    static class Status implements java.util.concurrent.Callable<Integer> {
        @Option(names = "--url", defaultValue = "http://127.0.0.1:8790/aep/api/healthz") String url;
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
        @Option(names = "--url", defaultValue = "ws://127.0.0.1:8787/aep") String url;
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
                "aep_version", "0.1",
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
        @Option(names = "--url", defaultValue = "ws://127.0.0.1:8787/aep") String url;
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
        @Option(names = "--config", defaultValue = "aep.config.json") String config;
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
}
