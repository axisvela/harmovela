package runtime

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/axisrobo/harmovela/aep"
	"github.com/axisrobo/harmovela/aep/store"
	"github.com/axisrobo/harmovela/aep/transport"
	eventcore "github.com/axisrobo/harmovela/event"
	"github.com/google/uuid"
)

type TransportConfig struct {
	Enabled bool   `json:"enabled"`
	Host    string `json:"host"`
	Port    int    `json:"port"`
	Path    string `json:"path"`
}

type DeliveryConfig struct {
	Store    string            `json:"store"`
	Sqlite   map[string]string `json:"sqlite"`
	Postgres map[string]string `json:"postgres"`
}

type RuntimeConfig struct {
	SpecVersion string `json:"spec_version"`
	Runtime     struct {
		ID     string `json:"id"`
		Source string `json:"source"`
	} `json:"runtime"`
	Transports struct {
		WebSocket TransportConfig `json:"websocket"`
		SSE       TransportConfig `json:"sse"`
		API       TransportConfig `json:"api"`
		Stdio     TransportConfig `json:"stdio"`
	} `json:"transports"`
	Delivery DeliveryConfig `json:"delivery"`
}

func DefaultConfig() RuntimeConfig {
	var c RuntimeConfig
	c.SpecVersion = "0.2"
	c.Runtime.ID = "aepd-local"
	c.Runtime.Source = "runtime:aepd"
	c.Transports.WebSocket = TransportConfig{Enabled: true, Host: "127.0.0.1", Port: 8787, Path: "/harmovela"}
	c.Transports.SSE = TransportConfig{Enabled: true, Host: "127.0.0.1", Port: 8788, Path: "/harmovela/events"}
	c.Transports.API = TransportConfig{Enabled: true, Host: "127.0.0.1", Port: 8790, Path: "/harmovela/api"}
	c.Transports.Stdio = TransportConfig{Enabled: false}
	c.Delivery = DeliveryConfig{
		Store:    "sqlite",
		Sqlite:   map[string]string{"path": ".aep/aep.sqlite"},
		Postgres: map[string]string{"url": "postgres://postgres:postgres@localhost:5433/postgres"},
	}
	return c
}

func WriteDefaultConfig(path string) error {
	data, err := json.MarshalIndent(DefaultConfig(), "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

func LoadConfig(path string, env map[string]string) (RuntimeConfig, error) {
	if env == nil {
		env = envMap()
	}
	if path == "" {
		path = envOr(env, "HARMOVELA_CONFIG", "harmovela.config.json")
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		return RuntimeConfig{}, err
	}
	var c RuntimeConfig
	if err := json.Unmarshal(raw, &c); err != nil {
		return RuntimeConfig{}, err
	}
	return ApplyEnvOverrides(c, env), nil
}

func ApplyEnvOverrides(c RuntimeConfig, env map[string]string) RuntimeConfig {
	if v := env["AEPD_HOST"]; v != "" {
		c.Transports.WebSocket.Host = v
		c.Transports.SSE.Host = v
		c.Transports.API.Host = v
	}
	if v := env["AEPD_WS_PORT"]; v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.Transports.WebSocket.Port = n
		}
	}
	if v := env["AEPD_SSE_PORT"]; v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.Transports.SSE.Port = n
		}
	}
	if v := env["AEPD_API_PORT"]; v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			c.Transports.API.Port = n
		}
	}
	if v := env["AEP_POSTGRES_URL"]; v != "" {
		c.Delivery.Postgres["url"] = v
	}
	return c
}

func CreateDeliveryStore(c RuntimeConfig) (store.DeliveryStore, error) {
	switch c.Delivery.Store {
	case "memory":
		return store.NewInMemoryDeliveryStore(0, "stream_01"), nil
	case "sqlite":
		path := ":memory:"
		if c.Delivery.Sqlite != nil && c.Delivery.Sqlite["path"] != "" {
			path = c.Delivery.Sqlite["path"]
		}
		return store.NewSqliteDeliveryStore(path, "stream_01")
	case "postgres":
		url := ""
		if c.Delivery.Postgres != nil {
			url = c.Delivery.Postgres["url"]
		}
		return store.NewPostgresDeliveryStore(url, "stream_01", store.PostgresOptions{})
	}
	return nil, fmt.Errorf("unsupported delivery store: %s", c.Delivery.Store)
}

type subEntry struct {
	pattern string
	handler func(event map[string]any)
}

type registryEntry struct {
	record map[string]any
	buffer []map[string]any
	sinks  map[chan map[string]any]bool
}

type RuntimeService struct {
	Config        RuntimeConfig
	store         store.DeliveryStore
	subs          []subEntry
	subscriptions map[string]*registryEntry
	maxBuffer     int
	ws            *transport.WsBroadcastServer
	api           *http.Server
	apiPort       int
	mu            sync.Mutex
	started       bool
}

func NewRuntimeService(c RuntimeConfig) *RuntimeService {
	store, _ := CreateDeliveryStore(c)
	return &RuntimeService{Config: c, store: store, subscriptions: make(map[string]*registryEntry), maxBuffer: 1000}
}

func (s *RuntimeService) Subscribe(pattern string, handler func(event map[string]any)) {
	s.subs = append(s.subs, subEntry{pattern: pattern, handler: handler})
}

func (s *RuntimeService) Publish(event map[string]any) (map[string]any, error) {
	errs := aep.ValidateEnvelope(event)
	if len(errs) > 0 {
		return nil, fmt.Errorf("invalid AEP event: %s", strings.Join(errs, "; "))
	}
	id, _ := event["id"].(string)
	sub, _ := event["subscription_id"].(string)
	if sub == "" {
		sub = "_runtime"
	}
	if s.store != nil {
		s.store.Track(id, sub)
	}
	typ, _ := event["type"].(string)
	for _, e := range s.subs {
		if eventcore.MatchesType(e.pattern, typ) {
			e.handler(event)
		}
	}
	if s.ws != nil {
		s.ws.Broadcast(event)
	}
	s.mu.Lock()
	for _, entry := range s.subscriptions {
		filter, _ := entry.record["filter"].(map[string]any)
		if eventcore.SubscriptionMatches(filter, event) {
			entry.buffer = append(entry.buffer, event)
			if len(entry.buffer) > s.maxBuffer {
				entry.buffer = entry.buffer[1:]
			}
			for sink := range entry.sinks {
				select {
				case sink <- event:
				default:
				}
			}
		}
	}
	s.mu.Unlock()
	return event, nil
}

func (s *RuntimeService) Start() error {
	if s.started {
		return nil
	}
	if s.Config.Transports.WebSocket.Enabled {
		ws := transport.NewWsBroadcastServer(s.Config.Transports.WebSocket.Path)
		ws.OnMessage(func(event map[string]any) { s.Publish(event) })
		addr := fmt.Sprintf("%s:%d", s.Config.Transports.WebSocket.Host, s.Config.Transports.WebSocket.Port)
		go ws.Start(addr)
		s.ws = ws
	}
	if s.Config.Transports.API.Enabled {
		if err := s.startAPI(); err != nil {
			return err
		}
	}
	for _, record := range s.store.ListSubscriptions() {
		id, _ := record["id"].(string)
		s.subscriptions[id] = &registryEntry{record: record, sinks: make(map[chan map[string]any]bool)}
	}
	s.started = true
	return nil
}

func (s *RuntimeService) Stop() {
	if s.ws != nil {
		s.ws.Stop()
		s.ws = nil
	}
	if s.api != nil {
		s.api.Close()
		s.api = nil
	}
	if closer, ok := s.store.(interface{ Close() error }); ok {
		closer.Close()
	}
	s.started = false
}

func (s *RuntimeService) APIPort() int { return s.apiPort }

func (s *RuntimeService) startAPI() error {
	base := s.Config.Transports.API.Path
	if base == "" {
		base = "/harmovela/api"
	}
	mux := http.NewServeMux()
	handler := func(w http.ResponseWriter, r *http.Request) {
		route := strings.TrimPrefix(r.URL.Path, base)
		s.handleAPI(route, w, r)
	}
	mux.HandleFunc(base+"/", handler)
	mux.HandleFunc(base, handler)

	bl, err := netListen(fmt.Sprintf("%s:%d", s.Config.Transports.API.Host, s.Config.Transports.API.Port))
	if err != nil {
		return err
	}
	s.apiPort = bl.port
	s.api = &http.Server{Handler: mux}
	go s.api.Serve(bl.listener)
	return nil
}

func (s *RuntimeService) handleAPI(route string, w http.ResponseWriter, r *http.Request) {
	switch {
	case route == "/healthz" && r.Method == http.MethodGet:
		sendJSON(w, 200, map[string]any{
			"status":   "ok",
			"runtime":  s.Config.Runtime,
			"delivery": s.store.GetStats(),
		})
	case route == "/events" && r.Method == http.MethodPost:
		s.handleIngest(w, r)
	case route == "/dlq" && r.Method == http.MethodGet:
		records := s.store.GetDeadLettered()
		sendJSON(w, 200, map[string]any{"deadLettered": len(records), "records": records})
	case route == "/pending" && r.Method == http.MethodGet:
		records := s.store.GetPending()
		sendJSON(w, 200, map[string]any{"pending": len(records), "records": records})
	case route == "/stats" && r.Method == http.MethodGet:
		sendJSON(w, 200, s.store.GetStats())
	case route == "/subscriptions" && r.Method == http.MethodPost:
		s.handleCreateSubscription(w, r)
	case route == "/subscriptions" && r.Method == http.MethodGet:
		sendJSON(w, 200, map[string]any{"subscriptions": s.ListSubscriptions()})
	case strings.HasPrefix(route, "/subscriptions/"):
		s.handleSubscriptionItem(route, w, r)
	default:
		sendJSON(w, 404, map[string]any{"error": "not found"})
	}
}

func (s *RuntimeService) handleIngest(w http.ResponseWriter, r *http.Request) {
	raw, _ := io.ReadAll(r.Body)
	var event map[string]any
	if err := json.Unmarshal(raw, &event); err != nil {
		sendJSON(w, 400, map[string]any{"accepted": false, "errors": []string{"invalid JSON body"}})
		return
	}
	if errs := aep.ValidateEnvelope(event); len(errs) > 0 {
		sendJSON(w, 400, map[string]any{"accepted": false, "errors": errs})
		return
	}
	s.Publish(event)
	sendJSON(w, 202, map[string]any{"accepted": true, "id": event["id"]})
}

func sendJSON(w http.ResponseWriter, status int, body map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(body)
}

func (s *RuntimeService) CreateSubscription(filter map[string]any) map[string]any {
	if filter == nil {
		filter = map[string]any{}
	}
	record := map[string]any{
		"id":         "sub_" + uuid.NewString(),
		"filter":     filter,
		"created_at": time.Now().UTC().Format(time.RFC3339),
	}
	s.store.CreateSubscription(record)
	s.mu.Lock()
	s.subscriptions[record["id"].(string)] = &registryEntry{record: record, sinks: make(map[chan map[string]any]bool)}
	s.mu.Unlock()
	return record
}

func (s *RuntimeService) ListSubscriptions() []map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]map[string]any, 0, len(s.subscriptions))
	for _, entry := range s.subscriptions {
		result = append(result, entry.record)
	}
	return result
}

func (s *RuntimeService) GetSubscription(id string) map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	if entry, ok := s.subscriptions[id]; ok {
		return entry.record
	}
	return nil
}

func (s *RuntimeService) DeleteSubscription(id string) bool {
	s.mu.Lock()
	_, existed := s.subscriptions[id]
	delete(s.subscriptions, id)
	s.mu.Unlock()
	s.store.DeleteSubscription(id)
	return existed
}

func (s *RuntimeService) TakeEvents(id string, max int) []map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.subscriptions[id]
	if !ok {
		return []map[string]any{}
	}
	n := max
	if n > len(entry.buffer) {
		n = len(entry.buffer)
	}
	taken := entry.buffer[:n]
	entry.buffer = entry.buffer[n:]
	return taken
}

func (s *RuntimeService) AttachStream(id string) (chan map[string]any, func()) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.subscriptions[id]
	if !ok {
		return nil, nil
	}
	ch := make(chan map[string]any, 64)
	entry.sinks[ch] = true
	detach := func() {
		s.mu.Lock()
		delete(entry.sinks, ch)
		s.mu.Unlock()
	}
	return ch, detach
}

func (s *RuntimeService) handleCreateSubscription(w http.ResponseWriter, r *http.Request) {
	raw, _ := io.ReadAll(r.Body)
	var body map[string]any
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &body); err != nil {
			sendJSON(w, 400, map[string]any{"error": "invalid JSON body"})
			return
		}
	} else {
		body = map[string]any{}
	}
	var filter map[string]any
	if f, ok := body["filter"].(map[string]any); ok {
		filter = f
	} else {
		filter = body
	}
	record := s.CreateSubscription(filter)
	sendJSON(w, 201, record)
}

func (s *RuntimeService) handleSubscriptionItem(route string, w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(route, "/subscriptions/")
	if strings.HasSuffix(rest, "/events") && r.Method == http.MethodGet {
		id := strings.TrimSuffix(rest, "/events")
		if s.GetSubscription(id) == nil {
			sendJSON(w, 404, map[string]any{"error": "not found"})
			return
		}
		sendJSON(w, 200, map[string]any{"events": s.TakeEvents(id, 100)})
		return
	}
	if strings.HasSuffix(rest, "/stream") && r.Method == http.MethodGet {
		id := strings.TrimSuffix(rest, "/stream")
		s.handleStream(id, w, r)
		return
	}
	if strings.Contains(rest, "/") {
		sendJSON(w, 404, map[string]any{"error": "not found"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		record := s.GetSubscription(rest)
		if record == nil {
			sendJSON(w, 404, map[string]any{"error": "not found"})
			return
		}
		sendJSON(w, 200, record)
	case http.MethodDelete:
		if s.DeleteSubscription(rest) {
			sendJSON(w, 200, map[string]any{"deleted": true})
		} else {
			sendJSON(w, 404, map[string]any{"error": "not found"})
		}
	default:
		sendJSON(w, 404, map[string]any{"error": "not found"})
	}
}

func (s *RuntimeService) handleStream(id string, w http.ResponseWriter, r *http.Request) {
	if s.GetSubscription(id) == nil {
		sendJSON(w, 404, map[string]any{"error": "not found"})
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		sendJSON(w, 500, map[string]any{"error": "streaming unsupported"})
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.WriteHeader(200)
	fmt.Fprint(w, ": ok\n\n")
	flusher.Flush()

	for _, evt := range s.TakeEvents(id, 1000) {
		writeSSE(w, flusher, evt)
	}
	ch, detach := s.AttachStream(id)
	if ch == nil {
		return
	}
	defer detach()
	for {
		select {
		case evt := <-ch:
			writeSSE(w, flusher, evt)
		case <-r.Context().Done():
			return
		}
	}
}

func writeSSE(w http.ResponseWriter, flusher http.Flusher, evt map[string]any) {
	data, _ := json.Marshal(evt)
	fmt.Fprintf(w, "data: %s\n\n", data)
	flusher.Flush()
}

type boundListener struct {
	listener net.Listener
	port     int
}

func netListen(addr string) (*boundListener, error) {
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}
	return &boundListener{listener: l, port: l.Addr().(*net.TCPAddr).Port}, nil
}

func envMap() map[string]string {
	m := make(map[string]string)
	for _, kv := range os.Environ() {
		parts := strings.SplitN(kv, "=", 2)
		if len(parts) == 2 {
			m[parts[0]] = parts[1]
		}
	}
	return m
}

func envOr(env map[string]string, key, fallback string) string {
	if v, ok := env[key]; ok && v != "" {
		return v
	}
	return fallback
}
