package com.axisrobo.aep.runtime;

public class Aepd {
    public static void main(String[] args) throws Exception {
        var configPath = System.getenv("AEP_CONFIG");
        Config config = configPath != null && !configPath.isEmpty()
            ? Config.load(configPath, System.getenv())
            : Config.defaultConfig();
        var svc = new AepRuntimeService(config);
        svc.start();
        System.out.println("aepd started api=" + svc.apiPort());
        Runtime.getRuntime().addShutdownHook(new Thread(svc::stop));
        Thread.currentThread().join();
    }
}
