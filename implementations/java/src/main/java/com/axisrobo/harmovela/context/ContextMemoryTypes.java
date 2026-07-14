package com.axisrobo.harmovela.context;

import java.util.Set;

public final class ContextMemoryTypes {
    private ContextMemoryTypes() {}

    public static final Set<String> EVENT_TYPES = Set.of(
        "context.updated",
        "context.invalidated",
        "context.snapshot.requested",
        "context.snapshot.ready",
        "context.retrieval.started",
        "context.retrieval.completed",
        "context.retrieval.failed",
        "memory.fact.added",
        "memory.fact.updated",
        "memory.fact.invalidated",
        "memory.episode.stored",
        "memory.preference.updated",
        "memory.constraint.updated",
        "memory.summary.ready",
        "memory.retrieval.ready",
        "belief.revised",
        "belief.conflict.detected",
        "provenance.attestation.added",
        "provenance.attestation.revoked",
        "provenance.chain.truncated"
    );

    public static boolean isContextMemoryEventType(String type) {
        return type != null && EVENT_TYPES.contains(type);
    }
}
