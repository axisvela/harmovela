package com.axisrobo.aep.examples;

import com.axisrobo.aep.runtime.AepRuntimeService;
import com.axisrobo.aep.runtime.Config;

/**
 * Minimal AEP runtime: create service, subscribe, publish, receive.
 * Run from implementations/java with the classpath set:
 * mvn -q compile exec:java -Dexec.mainClass=com.axisrobo.aep.examples.Quickstart
 */
public class Quickstart {
    public static void main(String[] args) {
        var config = Config.defaultConfig().withStore("memory")
            .withWebsocketEnabled(false).withSseEnabled(false)
            .withApi(new Config.Transport(false, "127.0.0.1", 0, "/aep/api"));

        var svc = new AepRuntimeService(config);
        svc.subscribe("task.*", e ->
            System.out.println("received " + e.get("type") + " " + e.get("id")));

        svc.start();
        svc.publish(java.util.Map.of(
            "aep_version", "0.1",
            "id", "evt_embed",
            "type", "task.submitted",
            "source", "example:quickstart",
            "created_at", java.time.Instant.now().toString(),
            "payload", java.util.Map.of("task_id", "task_01")
        ));
        svc.stop();
    }
}
