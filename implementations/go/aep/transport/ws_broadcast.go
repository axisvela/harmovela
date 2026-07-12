package transport

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type WsBroadcastServer struct {
	path       string
	httpServer *http.Server
	clients    map[*websocket.Conn]bool
	onMessage  func(event map[string]any)
	mu         sync.RWMutex
}

func NewWsBroadcastServer(path string) *WsBroadcastServer {
	if path == "" {
		path = "/harmovela"
	}
	return &WsBroadcastServer{
		path:    path,
		clients: make(map[*websocket.Conn]bool),
	}
}

func (s *WsBroadcastServer) OnMessage(handler func(event map[string]any)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onMessage = handler
}

func (s *WsBroadcastServer) Start(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc(s.path, s.handle)
	s.httpServer = &http.Server{Addr: addr, Handler: mux}
	err := s.httpServer.ListenAndServe()
	if err == http.ErrServerClosed {
		return nil
	}
	return err
}

func (s *WsBroadcastServer) Stop() {
	s.mu.Lock()
	for conn := range s.clients {
		conn.Close()
	}
	s.clients = make(map[*websocket.Conn]bool)
	s.mu.Unlock()
	if s.httpServer != nil {
		s.httpServer.Close()
	}
}

func (s *WsBroadcastServer) Broadcast(event map[string]any) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	s.mu.RLock()
	conns := make([]*websocket.Conn, 0, len(s.clients))
	for conn := range s.clients {
		conns = append(conns, conn)
	}
	s.mu.RUnlock()
	for _, conn := range conns {
		conn.WriteMessage(websocket.TextMessage, data)
	}
}

func (s *WsBroadcastServer) handle(w http.ResponseWriter, r *http.Request) {
	conn, err := Upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	s.mu.Lock()
	s.clients[conn] = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, conn)
		s.mu.Unlock()
		conn.Close()
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			return
		}
		var event map[string]any
		if err := json.Unmarshal(message, &event); err != nil {
			continue
		}
		s.mu.RLock()
		handler := s.onMessage
		s.mu.RUnlock()
		if handler != nil {
			handler(event)
		}
	}
}
