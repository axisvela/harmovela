package com.axisrobo.harmovela.event.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.function.Consumer;

public class WsClient {

    private final ObjectMapper mapper;
    private final URI serverUri;
    private InnerClient inner;
    private Consumer<Map<String, Object>> messageHandler;
    private Consumer<Exception> errorHandler;
    private Consumer<Integer> closeHandler;

    public WsClient(URI serverUri) {
        this.serverUri = serverUri;
        this.mapper = new ObjectMapper();
    }

    public void connect() {
        inner = new InnerClient(serverUri);
        try {
            inner.connectBlocking();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    public void close() {
        if (inner != null) {
            inner.close();
        }
    }

    public void onMessage(Consumer<Map<String, Object>> handler) {
        this.messageHandler = handler;
    }

    public void onError(Consumer<Exception> handler) {
        this.errorHandler = handler;
    }

    public void onClose(Consumer<Integer> handler) {
        this.closeHandler = handler;
    }

    public void send(Map<String, Object> event) throws IOException {
        var json = mapper.writeValueAsString(event);
        inner.send(json);
    }

    private class InnerClient extends WebSocketClient {

        InnerClient(URI serverUri) {
            super(serverUri);
        }

        @Override
        public void onMessage(String message) {
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
        public void onOpen(ServerHandshake handshake) {
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {
            var handler = closeHandler;
            if (handler != null) {
                handler.accept(code);
            }
        }

        @Override
        public void onError(Exception ex) {
            var handler = errorHandler;
            if (handler != null) {
                handler.accept(ex);
            }
        }
    }
}
