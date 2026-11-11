package com.axisvela.harmovela.client;

public class HarmovelaClientException extends RuntimeException {
    private final int status;
    private final Object body;

    public HarmovelaClientException(String message, int status, Object body) {
        super(message);
        this.status = status;
        this.body = body;
    }

    public int status() {
        return status;
    }

    public Object body() {
        return body;
    }
}
