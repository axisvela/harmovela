package com.axisrobo.aep.transport;

import aep.v1.Aep;
import aep.v1.AepTransportGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;

import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class GrpcClient {

    private final String host;
    private final int port;
    private ManagedChannel channel;
    private StreamObserver<Aep.AepMessage> requestObserver;
    private volatile Consumer<String> listener;

    public GrpcClient(String host, int port) {
        this.host = host;
        this.port = port;
    }

    public void setListener(Consumer<String> listener) {
        this.listener = listener;
    }

    public void connect() {
        channel = ManagedChannelBuilder.forAddress(host, port)
            .usePlaintext()
            .build();
        var stub = AepTransportGrpc.newStub(channel);
        requestObserver = stub.stream(new StreamObserver<Aep.AepMessage>() {
            @Override
            public void onNext(Aep.AepMessage msg) {
                var l = listener;
                if (l != null) {
                    l.accept(msg.getJsonPayload());
                }
            }

            @Override
            public void onError(Throwable t) {
            }

            @Override
            public void onCompleted() {
            }
        });
    }

    public void send(String jsonPayload) {
        if (requestObserver != null) {
            requestObserver.onNext(Aep.AepMessage.newBuilder()
                .setJsonPayload(jsonPayload).build());
        }
    }

    public void close() {
        if (requestObserver != null) {
            requestObserver.onCompleted();
            requestObserver = null;
        }
        if (channel != null) {
            channel.shutdown();
            try {
                channel.awaitTermination(5, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                channel.shutdownNow();
            }
            channel = null;
        }
    }
}
