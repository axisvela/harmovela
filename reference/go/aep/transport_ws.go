package aep

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WsServer struct {
	httpServer     *http.Server
	messageHandler MessageHandler
	mu             sync.RWMutex
}

func NewWsServer() *WsServer {
	return &WsServer{}
}

func (s *WsServer) OnMessage(handler MessageHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messageHandler = handler
}

func (s *WsServer) getHandler() MessageHandler {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.messageHandler
}

func (s *WsServer) Start(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", s.handleWs)
	s.httpServer = &http.Server{Addr: addr, Handler: mux}
	err := s.httpServer.ListenAndServe()
	if err == http.ErrServerClosed {
		return nil
	}
	return err
}

func (s *WsServer) Stop() {
	if s.httpServer != nil {
		s.httpServer.Close()
	}
}

func (s *WsServer) handleWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	handler := s.getHandler()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			return
		}

		if handler != nil {
			msg := &AepMessage{JsonPayload: string(message)}
			resp := handler(msg)
			if resp != nil {
				if err := conn.WriteMessage(websocket.TextMessage, []byte(resp.JsonPayload)); err != nil {
					return
				}
			}
		}
	}
}

type WsClient struct {
	conn    *websocket.Conn
	handler ReceiveHandler
	mu      sync.RWMutex
	done    chan struct{}
}

func NewWsClient() *WsClient {
	return &WsClient{done: make(chan struct{})}
}

func (c *WsClient) OnMessage(handler ReceiveHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handler = handler
}

func (c *WsClient) getHandler() ReceiveHandler {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.handler
}

func (c *WsClient) Connect(addr string) error {
	conn, _, err := websocket.DefaultDialer.Dial(addr, nil)
	if err != nil {
		return fmt.Errorf("ws dial: %w", err)
	}
	c.conn = conn
	go c.receiveLoop()
	return nil
}

func (c *WsClient) receiveLoop() {
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		handler := c.getHandler()
		if handler != nil {
			handler(&AepMessage{JsonPayload: string(message)})
		}
	}
}

func (c *WsClient) Send(msg *AepMessage) error {
	if c.conn == nil {
		return fmt.Errorf("not connected")
	}
	return c.conn.WriteMessage(websocket.TextMessage, []byte(msg.JsonPayload))
}

func (c *WsClient) Close() {
	if c.conn != nil {
		c.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		c.conn.Close()
	}
}
