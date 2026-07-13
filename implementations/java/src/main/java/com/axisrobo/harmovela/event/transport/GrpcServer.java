package com.axisrobo.harmovela.event.transport;

import harmovela.v1.Harmovela;
import harmovela.v1.HarmovelaTransportGrpc;
import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.stub.StreamObserver;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

public class GrpcServer {

    private Server server;
    private int port;
    private volatile Function<String, String> handler;

    public GrpcServer(int port) {
        this.port = port;
    }

    public void setHandler(Function<String, String> handler) {
        this.handler = handler;
    }

    public void start() throws IOException {
        server = ServerBuilder.forPort(port)
            .addService(new HarmovelaTransportImpl())
            .build()
            .start();
        this.port = server.getPort();
    }

    public void stop() {
        if (server != null && !server.isShutdown()) {
            server.shutdown();
            try {
                server.awaitTermination(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                server.shutdownNow();
            }
        }
    }

    public int getPort() {
        return port;
    }

    public boolean isShutdown() {
        return server == null || server.isShutdown();
    }

    private class HarmovelaTransportImpl extends HarmovelaTransportGrpc.HarmovelaTransportImplBase {
        @Override
        public StreamObserver<Harmovela.HarmovelaMessage> stream(StreamObserver<Harmovela.HarmovelaMessage> responseObserver) {
            return new StreamObserver<Harmovela.HarmovelaMessage>() {
                @Override
                public void onNext(Harmovela.HarmovelaMessage msg) {
                    var h = handler;
                    if (h != null) {
                        var response = h.apply(msg.getJsonPayload());
                        if (response != null) {
                            responseObserver.onNext(Harmovela.HarmovelaMessage.newBuilder()
                                .setJsonPayload(response).build());
                        }
                    }
                }

                @Override
                public void onError(Throwable t) {
                    responseObserver.onError(t);
                }

                @Override
                public void onCompleted() {
                    responseObserver.onCompleted();
                }
            };
        }
    }
}
