package aep

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AepTransport_StreamServer interface {
	Send(*AepMessage) error
	Recv() (*AepMessage, error)
	grpc.ServerStream
}

type AepTransport_StreamClient interface {
	Send(*AepMessage) error
	Recv() (*AepMessage, error)
	grpc.ClientStream
}

type AepTransportServer interface {
	Stream(AepTransport_StreamServer) error
}

type AepTransportClient interface {
	Stream(ctx context.Context, opts ...grpc.CallOption) (AepTransport_StreamClient, error)
}

func RegisterAepTransportServer(s *grpc.Server, srv AepTransportServer) {
	s.RegisterService(&grpc.ServiceDesc{
		ServiceName: "aep.v1.AepTransport",
		HandlerType: (*AepTransportServer)(nil),
		Methods:     []grpc.MethodDesc{},
		Streams: []grpc.StreamDesc{
			{
				StreamName:    "Stream",
				Handler:       _AepTransport_Stream_Handler,
				ServerStreams: true,
				ClientStreams: true,
			},
		},
		Metadata: "aep.proto",
	}, srv)
}

func _AepTransport_Stream_Handler(srv interface{}, stream grpc.ServerStream) error {
	return srv.(AepTransportServer).Stream(&aepTransportStreamServer{stream})
}

func NewAepTransportClient(cc grpc.ClientConnInterface) AepTransportClient {
	return &aepTransportClient{cc}
}

type aepTransportStreamServer struct {
	grpc.ServerStream
}

func (x *aepTransportStreamServer) Send(m *AepMessage) error {
	return x.ServerStream.SendMsg(m)
}

func (x *aepTransportStreamServer) Recv() (*AepMessage, error) {
	m := new(AepMessage)
	if err := x.ServerStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

type aepTransportClient struct {
	cc grpc.ClientConnInterface
}

func (c *aepTransportClient) Stream(ctx context.Context, opts ...grpc.CallOption) (AepTransport_StreamClient, error) {
	stream, err := c.cc.NewStream(ctx, &grpc.StreamDesc{
		StreamName:    "Stream",
		ServerStreams: true,
		ClientStreams: true,
	}, "/aep.v1.AepTransport/Stream", opts...)
	if err != nil {
		return nil, err
	}
	x := &aepTransportStreamClient{stream}
	return x, nil
}

type aepTransportStreamClient struct {
	grpc.ClientStream
}

func (x *aepTransportStreamClient) Send(m *AepMessage) error {
	return x.ClientStream.SendMsg(m)
}

func (x *aepTransportStreamClient) Recv() (*AepMessage, error) {
	m := new(AepMessage)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func init() {
	_ = status.Errorf // keep imports
	_ = codes.OK       // keep imports
}
