package aep.v1;

import static io.grpc.MethodDescriptor.generateFullMethodName;

/**
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.64.0)",
    comments = "Source: aep.proto")
@io.grpc.stub.annotations.GrpcGenerated
public final class AepTransportGrpc {

  private AepTransportGrpc() {}

  public static final java.lang.String SERVICE_NAME = "aep.v1.AepTransport";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<aep.v1.Aep.AepMessage,
      aep.v1.Aep.AepMessage> getStreamMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "Stream",
      requestType = aep.v1.Aep.AepMessage.class,
      responseType = aep.v1.Aep.AepMessage.class,
      methodType = io.grpc.MethodDescriptor.MethodType.BIDI_STREAMING)
  public static io.grpc.MethodDescriptor<aep.v1.Aep.AepMessage,
      aep.v1.Aep.AepMessage> getStreamMethod() {
    io.grpc.MethodDescriptor<aep.v1.Aep.AepMessage, aep.v1.Aep.AepMessage> getStreamMethod;
    if ((getStreamMethod = AepTransportGrpc.getStreamMethod) == null) {
      synchronized (AepTransportGrpc.class) {
        if ((getStreamMethod = AepTransportGrpc.getStreamMethod) == null) {
          AepTransportGrpc.getStreamMethod = getStreamMethod =
              io.grpc.MethodDescriptor.<aep.v1.Aep.AepMessage, aep.v1.Aep.AepMessage>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.BIDI_STREAMING)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "Stream"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  aep.v1.Aep.AepMessage.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  aep.v1.Aep.AepMessage.getDefaultInstance()))
              .setSchemaDescriptor(new AepTransportMethodDescriptorSupplier("Stream"))
              .build();
        }
      }
    }
    return getStreamMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static AepTransportStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<AepTransportStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<AepTransportStub>() {
        @java.lang.Override
        public AepTransportStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new AepTransportStub(channel, callOptions);
        }
      };
    return AepTransportStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static AepTransportBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<AepTransportBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<AepTransportBlockingStub>() {
        @java.lang.Override
        public AepTransportBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new AepTransportBlockingStub(channel, callOptions);
        }
      };
    return AepTransportBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static AepTransportFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<AepTransportFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<AepTransportFutureStub>() {
        @java.lang.Override
        public AepTransportFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new AepTransportFutureStub(channel, callOptions);
        }
      };
    return AepTransportFutureStub.newStub(factory, channel);
  }

  /**
   */
  public interface AsyncService {

    /**
     */
    default io.grpc.stub.StreamObserver<aep.v1.Aep.AepMessage> stream(
        io.grpc.stub.StreamObserver<aep.v1.Aep.AepMessage> responseObserver) {
      return io.grpc.stub.ServerCalls.asyncUnimplementedStreamingCall(getStreamMethod(), responseObserver);
    }
  }

  /**
   * Base class for the server implementation of the service AepTransport.
   */
  public static abstract class AepTransportImplBase
      implements io.grpc.BindableService, AsyncService {

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return AepTransportGrpc.bindService(this);
    }
  }

  /**
   * A stub to allow clients to do asynchronous rpc calls to service AepTransport.
   */
  public static final class AepTransportStub
      extends io.grpc.stub.AbstractAsyncStub<AepTransportStub> {
    private AepTransportStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected AepTransportStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new AepTransportStub(channel, callOptions);
    }

    /**
     */
    public io.grpc.stub.StreamObserver<aep.v1.Aep.AepMessage> stream(
        io.grpc.stub.StreamObserver<aep.v1.Aep.AepMessage> responseObserver) {
      return io.grpc.stub.ClientCalls.asyncBidiStreamingCall(
          getChannel().newCall(getStreamMethod(), getCallOptions()), responseObserver);
    }
  }

  /**
   * A stub to allow clients to do synchronous rpc calls to service AepTransport.
   */
  public static final class AepTransportBlockingStub
      extends io.grpc.stub.AbstractBlockingStub<AepTransportBlockingStub> {
    private AepTransportBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected AepTransportBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new AepTransportBlockingStub(channel, callOptions);
    }
  }

  /**
   * A stub to allow clients to do ListenableFuture-style rpc calls to service AepTransport.
   */
  public static final class AepTransportFutureStub
      extends io.grpc.stub.AbstractFutureStub<AepTransportFutureStub> {
    private AepTransportFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected AepTransportFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new AepTransportFutureStub(channel, callOptions);
    }
  }

  private static final int METHODID_STREAM = 0;

  private static final class MethodHandlers<Req, Resp> implements
      io.grpc.stub.ServerCalls.UnaryMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ServerStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ClientStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.BidiStreamingMethod<Req, Resp> {
    private final AsyncService serviceImpl;
    private final int methodId;

    MethodHandlers(AsyncService serviceImpl, int methodId) {
      this.serviceImpl = serviceImpl;
      this.methodId = methodId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public void invoke(Req request, io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        default:
          throw new AssertionError();
      }
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public io.grpc.stub.StreamObserver<Req> invoke(
        io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_STREAM:
          return (io.grpc.stub.StreamObserver<Req>) serviceImpl.stream(
              (io.grpc.stub.StreamObserver<aep.v1.Aep.AepMessage>) responseObserver);
        default:
          throw new AssertionError();
      }
    }
  }

  public static final io.grpc.ServerServiceDefinition bindService(AsyncService service) {
    return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
        .addMethod(
          getStreamMethod(),
          io.grpc.stub.ServerCalls.asyncBidiStreamingCall(
            new MethodHandlers<
              aep.v1.Aep.AepMessage,
              aep.v1.Aep.AepMessage>(
                service, METHODID_STREAM)))
        .build();
  }

  private static abstract class AepTransportBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    AepTransportBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return aep.v1.Aep.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("AepTransport");
    }
  }

  private static final class AepTransportFileDescriptorSupplier
      extends AepTransportBaseDescriptorSupplier {
    AepTransportFileDescriptorSupplier() {}
  }

  private static final class AepTransportMethodDescriptorSupplier
      extends AepTransportBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final java.lang.String methodName;

    AepTransportMethodDescriptorSupplier(java.lang.String methodName) {
      this.methodName = methodName;
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.MethodDescriptor getMethodDescriptor() {
      return getServiceDescriptor().findMethodByName(methodName);
    }
  }

  private static volatile io.grpc.ServiceDescriptor serviceDescriptor;

  public static io.grpc.ServiceDescriptor getServiceDescriptor() {
    io.grpc.ServiceDescriptor result = serviceDescriptor;
    if (result == null) {
      synchronized (AepTransportGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new AepTransportFileDescriptorSupplier())
              .addMethod(getStreamMethod())
              .build();
        }
      }
    }
    return result;
  }
}
