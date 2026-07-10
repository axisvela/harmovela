package aep

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
)

type NatsEventHandler func(event map[string]any)
type NatsErrorHandler func(err error)

type NatsTransport struct {
	nc        *nats.Conn
	js        nats.JetStreamContext
	sub       *nats.Subscription
	subject   string
	prefix    string
	onMessage NatsEventHandler
	onError   NatsErrorHandler
	mu        sync.RWMutex
	done      chan struct{}
	running   bool
}

func NewNatsTransport(url string, options ...nats.Option) (*NatsTransport, error) {
	nc, err := nats.Connect(url, options...)
	if err != nil {
		return nil, fmt.Errorf("nats connect: %w", err)
	}

	return &NatsTransport{
		nc:      nc,
		prefix:  "aep",
		subject: "aep.>",
		done:    make(chan struct{}),
	}, nil
}

func NewNatsTransportWithConn(nc *nats.Conn) *NatsTransport {
	return &NatsTransport{
		nc:      nc,
		prefix:  "aep",
		subject: "aep.>",
		done:    make(chan struct{}),
	}
}

func (t *NatsTransport) SetPrefix(prefix string) {
	t.prefix = prefix
	t.subject = prefix + ".>"
}

func (t *NatsTransport) SetSubject(subject string) {
	t.subject = subject
}

func (t *NatsTransport) OnMessage(handler NatsEventHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onMessage = handler
}

func (t *NatsTransport) OnError(handler NatsErrorHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onError = handler
}

func (t *NatsTransport) Start() {
	t.mu.Lock()
	if t.running {
		t.mu.Unlock()
		return
	}
	t.running = true
	t.done = make(chan struct{})
	t.mu.Unlock()

	handler := t.getHandler()
	errHandler := t.getErrorHandler()

	sub, err := t.nc.Subscribe(t.subject, func(msg *nats.Msg) {
		var event map[string]any
		if err := json.Unmarshal(msg.Data, &event); err != nil {
			if errHandler != nil {
				errHandler(fmt.Errorf("malformed JSON on subject %s: %w", msg.Subject, err))
			}
			return
		}
		if handler != nil {
			handler(event)
		}
	})

	if err != nil {
		if errHandler != nil {
			errHandler(fmt.Errorf("nats subscribe: %w", err))
		}
		return
	}

	t.mu.Lock()
	t.sub = sub
	t.mu.Unlock()
}

func (t *NatsTransport) Stop() {
	t.mu.Lock()
	t.running = false
	t.mu.Unlock()

	if t.sub != nil {
		t.sub.Unsubscribe()
	}

	select {
	case <-t.done:
	default:
		close(t.done)
	}
}

func (t *NatsTransport) Close() {
	t.Stop()
	if t.nc != nil {
		t.nc.Drain()
		t.nc.Close()
	}
}

func (t *NatsTransport) Send(event map[string]any) error {
	subject := t.eventSubject(event)
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("json marshal: %w", err)
	}
	return t.nc.Publish(subject, data)
}

func (t *NatsTransport) SendTo(subject string, event map[string]any) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("json marshal: %w", err)
	}
	return t.nc.Publish(subject, data)
}

func (t *NatsTransport) eventSubject(event map[string]any) string {
	if topic, ok := event["topic"].(string); ok && topic != "" {
		return t.prefix + ".topic." + topic
	}
	if typ, ok := event["type"].(string); ok && typ != "" {
		return t.prefix + ".type." + typ
	}
	if source, ok := event["source"].(string); ok && source != "" {
		return t.prefix + ".source." + source
	}
	return t.prefix + ".event"
}

func (t *NatsTransport) SubscriptionTypes(patterns []string, sessionID string) []string {
	subjects := make([]string, 0, len(patterns)+1)
	for _, p := range patterns {
		if p == "*" {
			subjects = append(subjects, t.prefix+".>")
			continue
		}
		natsPattern := t.prefix + ".type." + p
		natsPattern = replaceWildcard(natsPattern)
		subjects = append(subjects, natsPattern)
	}
	if sessionID != "" {
		subjects = append(subjects, t.prefix+".sess."+sessionID)
	}
	return subjects
}

func replaceWildcard(pattern string) string {
	last := len(pattern)
	for i := len(pattern) - 1; i >= 0; i-- {
		if pattern[i] == '*' {
			last = i
		} else if pattern[i] == '.' && last == i+1 {
			pattern = pattern[:i+1] + ">" + pattern[last+1:]
			break
		}
	}
	return pattern
}

func (t *NatsTransport) getHandler() NatsEventHandler {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.onMessage
}

func (t *NatsTransport) getErrorHandler() NatsErrorHandler {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.onError
}

func (t *NatsTransport) IsRunning() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.running
}

// JetStream helper: returns a JetStream context
func (t *NatsTransport) JetStream() (nats.JetStreamContext, error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.js != nil {
		return t.js, nil
	}

	js, err := t.nc.JetStream()
	if err != nil {
		return nil, fmt.Errorf("jetstream: %w", err)
	}
	t.js = js
	return t.js, nil
}

// Request sends a request and waits for a single reply.
func (t *NatsTransport) Request(subject string, event map[string]any, timeout time.Duration) (map[string]any, error) {
	data, err := json.Marshal(event)
	if err != nil {
		return nil, fmt.Errorf("json marshal: %w", err)
	}

	msg, err := t.nc.Request(subject, data, timeout)
	if err != nil {
		return nil, fmt.Errorf("nats request: %w", err)
	}

	var result map[string]any
	if err := json.Unmarshal(msg.Data, &result); err != nil {
		return nil, fmt.Errorf("json unmarshal response: %w", err)
	}
	return result, nil
}
