package com.axisrobo.aep.transport;

import harmovela.v1.Harmovela;
import harmovela.v1.HarmovelaTransportGrpc;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class GrpcTransportTest {

    @Test
    void serverStartsAndAcceptsConnections() throws Exception {
        GrpcServer server = new GrpcServer(0);
        server.setHandler(json -> json);
        server.start();

        assertTrue(server.getPort() > 0, "server should bind to a port");

        ManagedChannel channel = ManagedChannelBuilder
            .forAddress("localhost", server.getPort())
            .usePlaintext()
            .build();

        var stub = HarmovelaTransportGrpc.newStub(channel);
        var latch = new CountDownLatch(1);
        var responseObserver = new StreamObserver<Harmovela.HarmovelaMessage>() {
            @Override public void onNext(Harmovela.HarmovelaMessage msg) { latch.countDown(); }
            @Override public void onError(Throwable t) {}
            @Override public void onCompleted() {}
        };
        var requestObserver = stub.stream(responseObserver);
        requestObserver.onNext(Harmovela.HarmovelaMessage.newBuilder()
            .setJsonPayload("{\"type\":\"test\"}").build());
        requestObserver.onCompleted();

        assertTrue(latch.await(5, TimeUnit.SECONDS), "server should respond");

        channel.shutdownNow();
        server.stop();
    }

    @Test
    void clientConnectsAndExchangesMessages() throws Exception {
        GrpcServer server = new GrpcServer(0);
        var serverReceived = new CountDownLatch(1);
        server.setHandler(json -> {
            serverReceived.countDown();
            return json;
        });
        server.start();

        GrpcClient client = new GrpcClient("localhost", server.getPort());
        var clientReceived = new ArrayList<String>();
        var clientLatch = new CountDownLatch(1);
        client.setListener(msg -> {
            clientReceived.add(msg);
            clientLatch.countDown();
        });
        client.connect();
        client.send("{\"type\":\"exchange\",\"id\":\"001\"}");

        assertTrue(serverReceived.await(5, TimeUnit.SECONDS), "server should receive");
        assertTrue(clientLatch.await(5, TimeUnit.SECONDS), "client should receive echo");

        assertEquals(1, clientReceived.size());

        client.close();
        server.stop();
    }

    @Test
    void bidirectionalStreaming() throws Exception {
        GrpcServer server = new GrpcServer(0);
        var serverReceived = new ArrayList<String>();
        server.setHandler(json -> {
            serverReceived.add(json);
            return "{\"echo\":\"" + json + "\"}";
        });
        server.start();

        GrpcClient client = new GrpcClient("localhost", server.getPort());
        var clientReceived = new ArrayList<String>();
        var clientLatch = new CountDownLatch(3);
        client.setListener(msg -> {
            clientReceived.add(msg);
            clientLatch.countDown();
        });
        client.connect();

        client.send("{\"type\":\"msg1\"}");
        client.send("{\"type\":\"msg2\"}");
        client.send("{\"type\":\"msg3\"}");

        assertTrue(clientLatch.await(5, TimeUnit.SECONDS), "client should receive 3 echoes");
        assertEquals(3, clientReceived.size());
        assertEquals(3, serverReceived.size());

        client.close();
        server.stop();
    }

    @Test
    void serverShutdownStopsCleanly() throws Exception {
        GrpcServer server = new GrpcServer(0);
        server.setHandler(json -> json);
        server.start();
        int port = server.getPort();

        GrpcClient client = new GrpcClient("localhost", port);
        var received = new ArrayList<String>();
        var latch = new CountDownLatch(1);
        client.setListener(msg -> {
            received.add(msg);
            latch.countDown();
        });
        client.connect();

        client.send("{\"type\":\"before_stop\"}");
        assertTrue(latch.await(5, TimeUnit.SECONDS), "should receive before shutdown");

        client.close();
        server.stop();

        assertTrue(server.isShutdown(), "server should be shut down");

        GrpcServer newServer = new GrpcServer(port);
        try {
            newServer.start();
            assertTrue(newServer.getPort() > 0, "should be able to bind to same port after shutdown");
        } finally {
            newServer.stop();
        }
    }
}
