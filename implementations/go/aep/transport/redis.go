package transport

import (
	"encoding/json"
	"fmt"
	"sync"
)

type RedisEventHandler func(event map[string]any)
type RedisErrorHandler func(err error)

type RedisTransport struct {
	addr      string
	stream    string
	prefix    string
	onMessage RedisEventHandler
	onError   RedisErrorHandler
	mu        sync.RWMutex
	running   bool
}

func NewRedisTransport(addr string, stream string) *RedisTransport {
	if addr == "" {
		addr = "localhost:6379"
	}
	if stream == "" {
		stream = "aep.events"
	}
	return &RedisTransport{
		addr:   addr,
		stream: stream,
		prefix: "aep",
	}
}

func (t *RedisTransport) SetPrefix(prefix string) { t.prefix = prefix }

func (t *RedisTransport) OnMessage(handler RedisEventHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onMessage = handler
}

func (t *RedisTransport) OnError(handler RedisErrorHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onError = handler
}

func (t *RedisTransport) Start() {
	t.mu.Lock()
	if t.running {
		t.mu.Unlock()
		return
	}
	t.running = true
	t.mu.Unlock()
}

func (t *RedisTransport) Stop() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.running = false
}

func (t *RedisTransport) IsRunning() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.running
}

func (t *RedisTransport) streamKey(event map[string]any) string {
	if typ, ok := event["type"].(string); ok && typ != "" {
		return t.prefix + ".type." + typ
	}
	if source, ok := event["source"].(string); ok && source != "" {
		return t.prefix + ".source." + source
	}
	return t.stream
}

func (t *RedisTransport) consumerGroup(event map[string]any) string {
	if v, ok := event["session_id"].(string); ok && v != "" {
		return t.prefix + "-" + v
	}
	return t.prefix + "-default"
}

func (t *RedisTransport) entryFields(event map[string]any) map[string]string {
	f := make(map[string]string)
	if data, err := json.Marshal(event); err == nil {
		f["body"] = string(data)
	}
	if v, ok := event["type"].(string); ok {
		f["aep-type"] = v
	}
	if v, ok := event["source"].(string); ok {
		f["aep-source"] = v
	}
	if v, ok := event["session_id"].(string); ok {
		f["aep-session"] = v
	}
	if v, ok := event["conversation_id"].(string); ok {
		f["aep-conversation"] = v
	}
	if v, ok := event["task_id"].(string); ok {
		f["aep-task"] = v
	}
	if v, ok := event["correlation_id"].(string); ok {
		f["aep-correlation"] = v
	}
	if v, ok := event["causation_id"].(string); ok {
		f["aep-causation"] = v
	}
	if d, ok := event["delivery"].(map[string]any); ok {
		if m, ok := d["mode"].(string); ok {
			f["aep-delivery-mode"] = m
		}
	}
	return f
}

func (t *RedisTransport) Send(event map[string]any) error {
	_, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("json marshal: %w", err)
	}
	return nil
}

func (t *RedisTransport) getHandler() RedisEventHandler {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.onMessage
}

func (t *RedisTransport) getErrorHandler() RedisErrorHandler {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.onError
}
