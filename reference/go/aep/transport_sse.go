package aep

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
)

type SseServer struct {
	clients map[chan map[string]any]struct{}
	mu      sync.RWMutex
}

func NewSseServer() *SseServer {
	return &SseServer{
		clients: make(map[chan map[string]any]struct{}),
	}
}

func (s *SseServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.URL.Path == "/events" && r.Method == http.MethodGet:
		s.handleEvents(w, r)
	case r.URL.Path == "/ingest" && r.Method == http.MethodPost:
		s.handleIngest(w, r)
	default:
		if r.URL.Path == "/events" || r.URL.Path == "/ingest" {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		http.NotFound(w, r)
	}
}

func (s *SseServer) handleEvents(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	ch := make(chan map[string]any, 64)
	s.mu.Lock()
	s.clients[ch] = struct{}{}
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, ch)
		s.mu.Unlock()
	}()

	ctx := r.Context()
	for {
		select {
		case event, ok := <-ch:
			if !ok {
				return
			}
			s.writeSseEvent(w, event, flusher)
		case <-ctx.Done():
			return
		}
	}
}

func (s *SseServer) writeSseEvent(w io.Writer, event map[string]any, flusher http.Flusher) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	if id, ok := event["id"].(string); ok && id != "" {
		fmt.Fprintf(w, "id: %s\n", id)
	}
	if typ, ok := event["type"].(string); ok && typ != "" {
		fmt.Fprintf(w, "event: %s\n", typ)
	}
	fmt.Fprintf(w, "data: %s\n\n", string(data))
	flusher.Flush()
}

func (s *SseServer) handleIngest(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}

	contentType := r.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "application/json") {
		http.Error(w, "Content-Type must be application/json", http.StatusBadRequest)
		return
	}

	var event map[string]any
	if err := json.Unmarshal(body, &event); err != nil {
		http.Error(w, "invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	s.broadcast(event)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]any{
		"accepted": 1,
		"rejected": 0,
	})
}

func (s *SseServer) broadcast(event map[string]any) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for ch := range s.clients {
		select {
		case ch <- event:
		default:
		}
	}
}
