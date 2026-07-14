package com.axisrobo.harmovela.examples;

import com.axisrobo.harmovela.runtime.HarmovelaRuntimeService;
import com.axisrobo.harmovela.runtime.Config;

public class Quickstart {
    public static void main(String[] args) {
        var config = Config.defaultConfig().withStore("memory")
            .withWebsocketEnabled(false).withSseEnabled(false)
            .withApi(new Config.Transport(false, "127.0.0.1", 0, "/harmovela/api"));

        var svc = new HarmovelaRuntimeService(config);
        svc.subscribe("task.*", e ->
            System.out.println("received " + e.get("type") + " " + e.get("id")));

        svc.start();
        svc.publish(java.util.Map.of(
            "spec_version", "0.2",
            "id", "evt_embed",
            "type", "task.submitted",
            "source", "example:quickstart",
            "created_at", java.time.Instant.now().toString(),
            "payload", java.util.Map.of("task_id", "task_01")
        ));
        svc.stop();
    }
}
