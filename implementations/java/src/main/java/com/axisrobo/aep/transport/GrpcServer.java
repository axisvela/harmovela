package com.axisrobo.aep.transport;

import aep.v1.Aep;
import aep.v1.AepTransportGrpc;
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
            .addService(new AepTransportImpl())
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

    private class AepTransportImpl extends AepTransportGrpc.AepTransportImplBase {
        @Override
        public StreamObserver<Aep.AepMessage> stream(StreamObserver<Aep.AepMessage> responseObserver) {
            return new StreamObserver<Aep.AepMessage>() {
                @Override
                public void onNext(Aep.AepMessage msg) {
                    var h = handler;
                    if (h != null) {
                        var response = h.apply(msg.getJsonPayload());
                        if (response != null) {
                            responseObserver.onNext(Aep.AepMessage.newBuilder()
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
