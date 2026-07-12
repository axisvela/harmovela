package transport

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"sync"
)

type StdioEventHandler func(event map[string]any)
type StdioErrorHandler func(err error)

type StdioTransport struct {
	reader     io.Reader
	writer     io.Writer
	scanner    *bufio.Scanner
	onMessage  StdioEventHandler
	onError    StdioErrorHandler
	mu         sync.RWMutex
	done       chan struct{}
	running    bool
}

func NewStdioTransport(reader io.Reader, writer io.Writer) *StdioTransport {
	return &StdioTransport{
		reader: reader,
		writer: writer,
		done:   make(chan struct{}),
	}
}

func (t *StdioTransport) OnMessage(handler StdioEventHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onMessage = handler
}

func (t *StdioTransport) OnError(handler StdioErrorHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.onError = handler
}

func (t *StdioTransport) getHandler() StdioEventHandler {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.onMessage
}

func (t *StdioTransport) getErrorHandler() StdioErrorHandler {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.onError
}

func (t *StdioTransport) Start() {
	t.mu.Lock()
	if t.running {
		t.mu.Unlock()
		return
	}
	t.running = true
	t.done = make(chan struct{})
	t.scanner = bufio.NewScanner(t.reader)
	t.mu.Unlock()

	go t.readLoop()
}

func (t *StdioTransport) readLoop() {
	handler := t.getHandler()
	errHandler := t.getErrorHandler()

	for t.scanner.Scan() {
		line := t.scanner.Text()
		if line == "" {
			continue
		}

		var event map[string]any
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			if errHandler != nil {
				errHandler(fmt.Errorf("malformed JSON: %w", err))
			}
			continue
		}
		if handler != nil {
			handler(event)
		}
	}

	close(t.done)
}

func (t *StdioTransport) Stop() {
	t.mu.Lock()
	t.running = false
	t.mu.Unlock()

	select {
	case <-t.done:
	default:
	}
}

func (t *StdioTransport) Send(event map[string]any) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("json marshal: %w", err)
	}
	data = append(data, '\n')
	_, err = t.writer.Write(data)
	if err != nil {
		return fmt.Errorf("write: %w", err)
	}
	return nil
}
