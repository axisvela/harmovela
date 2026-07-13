package com.axisrobo.harmovela.event.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class WsServer extends WebSocketServer {

    private final ObjectMapper mapper;
    private final CountDownLatch startLatch;
    private int boundPort;
    private Consumer<Map<String, Object>> messageHandler;

    public WsServer(int port) {
        super(new InetSocketAddress(port));
        this.mapper = new ObjectMapper();
        this.startLatch = new CountDownLatch(1);
    }

    @Override
    public void start() {
        super.start();
        try {
            startLatch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public int getPort() {
        return boundPort > 0 ? boundPort : super.getPort();
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        try {
            @SuppressWarnings("unchecked")
            var event = (Map<String, Object>) mapper.readValue(message, Map.class);
            var handler = messageHandler;
            if (handler != null) {
                handler.accept(event);
            }
        } catch (IOException ignored) {
        }
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
    }

    @Override
    public void onStart() {
        boundPort = super.getPort();
        startLatch.countDown();
    }

    public void onMessage(Consumer<Map<String, Object>> handler) {
        this.messageHandler = handler;
    }

    public void broadcast(Map<String, Object> event) throws IOException {
        var json = mapper.writeValueAsString(event);
        super.broadcast(json);
    }
}
