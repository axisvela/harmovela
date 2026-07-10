package com.axisrobo.aep.transport;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

public class StdioTransport {

    private final ObjectMapper mapper;
    private Reader reader;
    private Writer writer;
    private volatile Consumer<Map<String, Object>> messageHandler;
    private volatile Consumer<Exception> errorHandler;
    private Thread readerThread;
    private final AtomicBoolean running;
    private CountDownLatch doneLatch;

    public StdioTransport() {
        this.mapper = new ObjectMapper();
        this.running = new AtomicBoolean(false);
    }

    public void start(Reader reader, Writer writer) {
        this.reader = reader;
        this.writer = writer;
        doneLatch = new CountDownLatch(1);
        running.set(true);
        readerThread = new Thread(this::readLoop, "aep-stdio-reader");
        readerThread.setDaemon(true);
        readerThread.start();
    }

    public void stop() {
        try {
            doneLatch.await(100, TimeUnit.MILLISECONDS);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
        running.set(false);
        if (readerThread != null) {
            readerThread.interrupt();
            try {
                readerThread.join(1000);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
        }
    }

    public void onMessage(Consumer<Map<String, Object>> handler) {
        this.messageHandler = handler;
    }

    public void onError(Consumer<Exception> handler) {
        this.errorHandler = handler;
    }

    public void send(Map<String, Object> event) throws IOException {
        var json = mapper.writeValueAsString(event);
        writer.write(json);
        writer.write('\n');
        writer.flush();
    }

    @SuppressWarnings("unchecked")
    private void readLoop() {
        try (var br = new BufferedReader(reader)) {
            String line;
            while (running.get() && (line = br.readLine()) != null) {
                if (line.isEmpty()) {
                    continue;
                }
                try {
                    var event = (Map<String, Object>) mapper.readValue(line, Map.class);
                    var handler = messageHandler;
                    if (handler != null) {
                        handler.accept(event);
                    }
                } catch (IOException e) {
                    var errHandler = errorHandler;
                    if (errHandler != null) {
                        errHandler.accept(e);
                    }
                }
            }
        } catch (IOException e) {
            var errHandler = errorHandler;
            if (errHandler != null) {
                errHandler.accept(e);
            }
        } finally {
            doneLatch.countDown();
        }
    }
}
