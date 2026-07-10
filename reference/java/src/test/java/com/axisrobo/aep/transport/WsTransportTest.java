package com.axisrobo.aep.transport;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class WsTransportTest {

    private WsServer server;

    @AfterEach
    void tearDown() throws Exception {
        if (server != null) {
            server.stop();
        }
    }

    @Test
    void serverStartsOnRandomPort() throws Exception {
        server = new WsServer(0);
        server.start();

        int port = server.getPort();
        assertTrue(port > 0, "server should bind to a random port when given 0");
    }

    @Test
    void clientConnectsAndExchangesMessage() throws Exception {
        server = new WsServer(0);

        var latch = new CountDownLatch(1);
        var received = new ArrayList<Map<String, Object>>();
        server.onMessage(event -> {
            received.add(event);
            latch.countDown();
        });
        server.start();

        int port = server.getPort();
        var client = new WsClient(new URI("ws://localhost:" + port));

        client.connect();

        var event = Map.<String, Object>of(
            "type", "test",
            "message", "hello"
        );
        client.send(event);

        assertTrue(latch.await(2, TimeUnit.SECONDS), "server should receive the message");
        assertEquals(1, received.size());
        assertEquals("hello", received.get(0).get("message"));

        client.close();
    }

    @Test
    void bidirectionalCommunication() throws Exception {
        server = new WsServer(0);

        var serverLatch = new CountDownLatch(1);
        var serverReceived = new ArrayList<Map<String, Object>>();
        server.onMessage(event -> {
            serverReceived.add(event);
            serverLatch.countDown();
        });
        server.start();

        int port = server.getPort();
        var client = new WsClient(new URI("ws://localhost:" + port));

        var clientLatch = new CountDownLatch(1);
        var clientReceived = new ArrayList<Map<String, Object>>();
        client.onMessage(event -> {
            clientReceived.add(event);
            clientLatch.countDown();
        });

        client.connect();

        var clientEvent = Map.<String, Object>of("direction", "client-to-server");
        client.send(clientEvent);

        assertTrue(serverLatch.await(2, TimeUnit.SECONDS), "server should receive client-to-server message");

        var serverEvent = Map.<String, Object>of("direction", "server-to-client");
        server.broadcast(serverEvent);

        assertTrue(clientLatch.await(2, TimeUnit.SECONDS), "client should receive server-to-client message");

        assertEquals(1, serverReceived.size());
        assertEquals("client-to-server", serverReceived.get(0).get("direction"));

        assertEquals(1, clientReceived.size());
        assertEquals("server-to-client", clientReceived.get(0).get("direction"));

        client.close();
    }

    @Test
    void serverShutsDownCleanly() throws Exception {
        server = new WsServer(0);
        server.start();

        int port = server.getPort();
        var client = new WsClient(new URI("ws://localhost:" + port));

        var closed = new CountDownLatch(1);
        client.onClose(code -> closed.countDown());

        client.connect();
        Thread.sleep(100);

        server.stop();

        assertTrue(closed.await(2, TimeUnit.SECONDS), "client should be notified of close");
        client.close();
    }
}
