package com.axisrobo.harmovela.runtime;

public class Harmovelad {
    public static void main(String[] args) throws Exception {
        var configPath = System.getenv("HARMOVELA_CONFIG");
        Config config = configPath != null && !configPath.isEmpty()
            ? Config.load(configPath, System.getenv())
            : Config.defaultConfig();
        var svc = new HarmovelaRuntimeService(config);
        svc.start();
        System.out.println("aepd started api=" + svc.apiPort());
        Runtime.getRuntime().addShutdownHook(new Thread(svc::stop));
        Thread.currentThread().join();
    }
}
