package aep

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type HarmovelaTransport_StreamServer interface {
	Send(*HarmovelaMessage) error
	Recv() (*HarmovelaMessage, error)
	grpc.ServerStream
}

type HarmovelaTransport_StreamClient interface {
	Send(*HarmovelaMessage) error
	Recv() (*HarmovelaMessage, error)
	grpc.ClientStream
}

type HarmovelaTransportServer interface {
	Stream(HarmovelaTransport_StreamServer) error
}

type HarmovelaTransportClient interface {
	Stream(ctx context.Context, opts ...grpc.CallOption) (HarmovelaTransport_StreamClient, error)
}

func RegisterHarmovelaTransportServer(s *grpc.Server, srv HarmovelaTransportServer) {
	s.RegisterService(&grpc.ServiceDesc{
		ServiceName: "harmovela.v1.HarmovelaTransport",
		HandlerType: (*HarmovelaTransportServer)(nil),
		Methods:     []grpc.MethodDesc{},
		Streams: []grpc.StreamDesc{
			{
				StreamName:    "Stream",
				Handler:       _HarmovelaTransport_Stream_Handler,
				ServerStreams: true,
				ClientStreams: true,
			},
		},
		Metadata: "aep.proto",
	}, srv)
}

func _HarmovelaTransport_Stream_Handler(srv interface{}, stream grpc.ServerStream) error {
	return srv.(HarmovelaTransportServer).Stream(&harmovelaTransportStreamServer{stream})
}

func NewHarmovelaTransportClient(cc grpc.ClientConnInterface) HarmovelaTransportClient {
	return &harmovelaTransportClient{cc}
}

type harmovelaTransportStreamServer struct {
	grpc.ServerStream
}

func (x *harmovelaTransportStreamServer) Send(m *HarmovelaMessage) error {
	return x.ServerStream.SendMsg(m)
}

func (x *harmovelaTransportStreamServer) Recv() (*HarmovelaMessage, error) {
	m := new(HarmovelaMessage)
	if err := x.ServerStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

type harmovelaTransportClient struct {
	cc grpc.ClientConnInterface
}

func (c *harmovelaTransportClient) Stream(ctx context.Context, opts ...grpc.CallOption) (HarmovelaTransport_StreamClient, error) {
	stream, err := c.cc.NewStream(ctx, &grpc.StreamDesc{
		StreamName:    "Stream",
		ServerStreams: true,
		ClientStreams: true,
	}, "/harmovela.v1.HarmovelaTransport/Stream", opts...)
	if err != nil {
		return nil, err
	}
	x := &harmovelaTransportStreamClient{stream}
	return x, nil
}

type harmovelaTransportStreamClient struct {
	grpc.ClientStream
}

func (x *harmovelaTransportStreamClient) Send(m *HarmovelaMessage) error {
	return x.ClientStream.SendMsg(m)
}

func (x *harmovelaTransportStreamClient) Recv() (*HarmovelaMessage, error) {
	m := new(HarmovelaMessage)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

func init() {
	_ = status.Errorf
	_ = codes.OK
}
