package aep

import (
	"fmt"
	"context"
	"io"
	"net"
	"sync"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type MessageHandler func(msg *AepMessage) *AepMessage

type ReceiveHandler func(msg *AepMessage)

type GrpcServer struct {
	grpcServer    *grpc.Server
	messageHandler MessageHandler
	mu            sync.RWMutex
}

func NewGrpcServer() *GrpcServer {
	return &GrpcServer{}
}

func (s *GrpcServer) OnMessage(handler MessageHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messageHandler = handler
}

func (s *GrpcServer) getHandler() MessageHandler {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.messageHandler
}

func (s *GrpcServer) Start(lis net.Listener) error {
	s.grpcServer = grpc.NewServer()
	RegisterAepTransportServer(s.grpcServer, s)
	return s.grpcServer.Serve(lis)
}

func (s *GrpcServer) Stop() {
	if s.grpcServer != nil {
		s.grpcServer.GracefulStop()
	}
}

func (s *GrpcServer) Stream(stream AepTransport_StreamServer) error {
	handler := s.getHandler()

	for {
		msg, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

		if handler != nil {
			resp := handler(msg)
			if resp != nil {
				if err := stream.Send(resp); err != nil {
					return err
				}
			}
		}
	}
}

type GrpcClient struct {
	conn    *grpc.ClientConn
	stream  AepTransport_StreamClient
	handler ReceiveHandler
	mu      sync.RWMutex
}

func NewGrpcClient() *GrpcClient {
	return &GrpcClient{}
}

func (c *GrpcClient) OnMessage(handler ReceiveHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.handler = handler
}

func (c *GrpcClient) getHandler() ReceiveHandler {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.handler
}

func (c *GrpcClient) Connect(addr string) error {
	conn, err := grpc.Dial(addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return fmt.Errorf("grpc dial: %w", err)
	}
	c.conn = conn

	stream, err := NewAepTransportClient(conn).Stream(context.Background())
	if err != nil {
		conn.Close()
		return fmt.Errorf("grpc stream: %w", err)
	}
	c.stream = stream

	go c.receiveLoop()

	return nil
}

func (c *GrpcClient) receiveLoop() {
	for {
		msg, err := c.stream.Recv()
		if err != nil {
			return
		}
		handler := c.getHandler()
		if handler != nil {
			handler(msg)
		}
	}
}

func (c *GrpcClient) Send(msg *AepMessage) error {
	if c.stream == nil {
		return fmt.Errorf("not connected")
	}
	return c.stream.Send(msg)
}

func (c *GrpcClient) Close() {
	if c.stream != nil {
		c.stream.CloseSend()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
