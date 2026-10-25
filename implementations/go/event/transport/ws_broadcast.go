package transport

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/axisvela/harmovela/implementations/go/v3/event"
	"github.com/gorilla/websocket"
)

// ReplayFunc returns retained events after fromCursor that match filter.
type ReplayFunc func(fromCursor string, filter map[string]any, limit int) []map[string]any

// AckResult reports the consumer's lag after a cursor acknowledgement.
type AckResult struct {
	LatestCursor string
	Lag          int
}

// AckFunc records a consumer's processed cursor.
type AckFunc func(consumerID, eventID, cursor string) (AckResult, error)

// SubscribeFunc observes a consumer subscription.
type SubscribeFunc func(consumerID string)

type wsClient struct {
	conn       *websocket.Conn
	writeMu    sync.Mutex
	filter     map[string]any
	consumerID string
	cursor     string
}

type WsBroadcastServer struct {
	path        string
	httpServer  *http.Server
	clients     map[*websocket.Conn]*wsClient
	onMessage   func(event map[string]any)
	onReplay    ReplayFunc
	onAck       AckFunc
	onSubscribe SubscribeFunc
	mu          sync.RWMutex
}

func NewWsBroadcastServer(path string) *WsBroadcastServer {
	if path == "" {
		path = "/harmovela"
	}
	return &WsBroadcastServer{
		path:    path,
		clients: make(map[*websocket.Conn]*wsClient),
	}
}

func (s *WsBroadcastServer) OnMessage(handler func(event map[string]any)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onMessage = handler
}

// OnReplay configures cursor-based replay for subscription requests.
func (s *WsBroadcastServer) OnReplay(replay ReplayFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onReplay = replay
}

// OnAck configures consumer acknowledgement handling.
func (s *WsBroadcastServer) OnAck(ack AckFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onAck = ack
}

// OnSubscribe configures a callback invoked for each consumer subscription.
func (s *WsBroadcastServer) OnSubscribe(subscribe SubscribeFunc) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onSubscribe = subscribe
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
	s.clients = make(map[*websocket.Conn]*wsClient)
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
	clients := make([]*wsClient, 0, len(s.clients))
	for _, client := range s.clients {
		clients = append(clients, client)
	}
	s.mu.RUnlock()
	for _, client := range clients {
		if client.filter != nil && !matchesClient(client.filter, event) {
			continue
		}
		client.write(data)
	}
}

func (s *WsBroadcastServer) handle(w http.ResponseWriter, r *http.Request) {
	conn, err := Upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := &wsClient{conn: conn}
	s.mu.Lock()
	s.clients[conn] = client
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
		var envelope map[string]any
		if err := json.Unmarshal(message, &envelope); err != nil {
			continue
		}
		switch stringField(envelope, "type") {
		case "subscription.requested":
			s.handleSubscription(client, envelope)
		case "event.acknowledged":
			s.handleAck(client, envelope)
		default:
			s.mu.RLock()
			handler := s.onMessage
			s.mu.RUnlock()
			if handler != nil {
				handler(envelope)
			}
		}
	}
}

func (s *WsBroadcastServer) handleSubscription(client *wsClient, envelope map[string]any) {
	payload, _ := envelope["payload"].(map[string]any)
	if payload == nil {
		payload = map[string]any{}
	}
	client.filter = payload
	client.consumerID = stringField(payload, "consumer_id")
	if client.consumerID == "" {
		client.consumerID = stringField(envelope, "consumer_id")
	}
	fromCursor := stringField(payload, "from_cursor")
	if client.consumerID != "" {
		s.mu.RLock()
		subscribe := s.onSubscribe
		s.mu.RUnlock()
		if subscribe != nil {
			subscribe(client.consumerID)
		}
	}

	s.mu.RLock()
	replay := s.onReplay
	s.mu.RUnlock()
	if replay == nil {
		return
	}
	for {
		events := replay(fromCursor, client.filter, 1000)
		if len(events) == 0 {
			return
		}
		for _, evt := range events {
			data, err := json.Marshal(evt)
			if err != nil {
				continue
			}
			client.write(data)
			if cursor := deliveryCursor(evt); cursor != "" {
				fromCursor = cursor
				client.cursor = cursor
			}
		}
		if len(events) < 1000 {
			return
		}
	}
}

func (s *WsBroadcastServer) handleAck(client *wsClient, envelope map[string]any) {
	payload, _ := envelope["payload"].(map[string]any)
	eventID := stringField(payload, "acknowledged_event_id")
	cursor := stringField(payload, "cursor")
	consumerID := client.consumerID
	if consumerID == "" {
		consumerID = stringField(payload, "consumer_id")
	}
	if cursor == "" {
		cursor = deliveryCursor(envelope)
	}
	if cursor != "" {
		client.cursor = cursor
	}
	if consumerID == "" {
		return
	}
	s.mu.RLock()
	ack := s.onAck
	s.mu.RUnlock()
	if ack == nil {
		return
	}
	result, err := ack(consumerID, eventID, cursor)
	if err != nil {
		return
	}
	response, err := json.Marshal(map[string]any{
		"spec_version": "0.2",
		"id":           "ack-response-" + eventID,
		"type":         "event.acknowledged",
		"source":       "harmovela",
		"created_at":   time.Now().UTC().Format(time.RFC3339),
		"payload": map[string]any{
			"consumer_id":           consumerID,
			"acknowledged_event_id": eventID,
			"cursor":                cursor,
			"latest_cursor":         result.LatestCursor,
			"lag":                   result.Lag,
		},
	})
	if err != nil {
		return
	}
	client.write(response)
}

func (c *wsClient) write(data []byte) {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	_ = c.conn.WriteMessage(websocket.TextMessage, data)
}

func matchesClient(filter map[string]any, evt map[string]any) bool {
	if !event.SubscriptionMatches(filter, evt) {
		return false
	}
	if tenantID, _ := filter["tenant_id"].(string); tenantID != "" && stringField(evt, "tenant_id") != tenantID {
		return false
	}
	if workspaceID, _ := filter["workspace_id"].(string); workspaceID != "" && stringField(evt, "workspace_id") != workspaceID {
		return false
	}
	return true
}

func stringField(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	text, _ := value[key].(string)
	return text
}

func deliveryCursor(event map[string]any) string {
	delivery, _ := event["delivery"].(map[string]any)
	return stringField(delivery, "cursor")
}
