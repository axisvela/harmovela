package transport

import (
	"encoding/json"
	"fmt"
	"sync"
)

type KafkaEventHandler func(event map[string]any)
type KafkaErrorHandler func(err error)

type KafkaTransport struct {
	brokers   []string
	topic     string
	prefix    string
	onMessage KafkaEventHandler
	onError   KafkaErrorHandler
	mu        sync.RWMutex
	running   bool
}

func NewKafkaTransport(brokers []string, topic string) *KafkaTransport {
	if len(brokers) == 0 {
		brokers = []string{"localhost:9092"}
	}
	if topic == "" {
		topic = "aep.events"
	}
	return &KafkaTransport{
		brokers: brokers,
		topic:   topic,
		prefix:  "aep",
	}
}

func (t *KafkaTransport) SetPrefix(prefix string) { t.prefix = prefix }

func (t *KafkaTransport) OnMessage(handler KafkaEventHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onMessage = handler
}

func (t *KafkaTransport) OnError(handler KafkaErrorHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onError = handler
}

func (t *KafkaTransport) Start() {
	t.mu.Lock()
	if t.running {
		t.mu.Unlock()
		return
	}
	t.running = true
	t.mu.Unlock()
}

func (t *KafkaTransport) Stop() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.running = false
}

func (t *KafkaTransport) IsRunning() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.running
}

func (t *KafkaTransport) messageKey(event map[string]any) string {
	if v, ok := event["task_id"].(string); ok && v != "" {
		return v
	}
	if v, ok := event["conversation_id"].(string); ok && v != "" {
		return v
	}
	if v, ok := event["session_id"].(string); ok && v != "" {
		return v
	}
	if v, ok := event["source"].(string); ok && v != "" {
		return v
	}
	return ""
}

func (t *KafkaTransport) targetTopic(event map[string]any) string {
	if typ, ok := event["type"].(string); ok && typ != "" {
		return t.prefix + ".type." + typ
	}
	if source, ok := event["source"].(string); ok && source != "" {
		return t.prefix + ".source." + source
	}
	return t.topic
}

func (t *KafkaTransport) messageHeaders(event map[string]any) map[string]string {
	h := make(map[string]string)
	if v, ok := event["type"].(string); ok {
		h["aep-type"] = v
	}
	if v, ok := event["source"].(string); ok {
		h["aep-source"] = v
	}
	if v, ok := event["session_id"].(string); ok {
		h["aep-session"] = v
	}
	if v, ok := event["conversation_id"].(string); ok {
		h["aep-conversation"] = v
	}
	if v, ok := event["task_id"].(string); ok {
		h["aep-task"] = v
	}
	if v, ok := event["correlation_id"].(string); ok {
		h["aep-correlation"] = v
	}
	if v, ok := event["causation_id"].(string); ok {
		h["aep-causation"] = v
	}
	if d, ok := event["delivery"].(map[string]any); ok {
		if m, ok := d["mode"].(string); ok {
			h["aep-delivery-mode"] = m
		}
	}
	return h
}

func (t *KafkaTransport) Send(event map[string]any) error {
	_, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("json marshal: %w", err)
	}
	return nil
}

func (t *KafkaTransport) getHandler() KafkaEventHandler {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.onMessage
}

func (t *KafkaTransport) getErrorHandler() KafkaErrorHandler {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.onError
}
