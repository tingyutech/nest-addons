import * as grpc from '@grpc/grpc-js'
import { CustomTransportStrategy, Server } from '@nestjs/microservices'
import { MethodInfo } from '@protobuf-ts/runtime-rpc'
import createDebug from 'debug'
import { GrpcTsContext } from './grpc-ts.context.js'
import { GrpcTsMethodExtras } from './grpc-ts.decorators.js'
import { GRPC_TS_TRANSPORT } from './grpc-ts.symbol.js'
import { getFullName } from './internal/get-full-name.js'
import { createGrpcServiceImplementationProxy } from './internal/gprc-service-implementation-proxy.js'
import { PackageDefinition } from '@grpc/proto-loader'
import { ReflectionService } from '@grpc/reflection'

const debug = createDebug('grpc-ts-transport')

export class GrpcTsTransport extends Server implements CustomTransportStrategy {
  public readonly transportId = GRPC_TS_TRANSPORT
  private methodInfos: Map<string, MethodInfo> = new Map()
  private grpcServices: Map<string, Record<string, grpc.MethodDefinition<any, any>>> = new Map()

  public constructor(
    private readonly grpcServer: grpc.Server,
    private readonly pkgDefinition?: PackageDefinition,
  ) {
    super()
    if (pkgDefinition) {
      const reflection = new ReflectionService(pkgDefinition)
      reflection.addToServer(this.grpcServer)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  public on<EventKey extends string = string, EventCallback extends Function = Function>(
    _event: EventKey,
    _callback: EventCallback,
  ) {
    throw new Error('event based api not supported in grpc-ts-transport')
  }

  public unwrap<T>(): T {
    return this.grpcServer as unknown as T
  }

  public close() {
    return new Promise<void>((resolve, reject) => {
      this.grpcServer.tryShutdown((err) => {
        if (err instanceof Error) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  public listen(callback: (...optionalParams: unknown[]) => any) {
    debug('checking %d message handlers', this.messageHandlers.size)
    for (const [fullName, value] of this.messageHandlers.entries()) {
      const extras = value.extras as GrpcTsMethodExtras
      const method = extras.methodInfo
      debug('adding message handlers for method', fullName)

      // ensure method info is valid
      console.assert(fullName === getFullName(method), 'method info mismatch method name')

      // construct grpc method definition dynamically
      const serviceDefinition = this.grpcServices.get(method.service.typeName) || {}
      serviceDefinition[method.name] = {
        path: `/${fullName}`,
        originalName: method.name,
        requestStream: method.clientStreaming,
        responseStream: method.serverStreaming,
        requestDeserialize: (b) => method.I.fromBinary(b),
        requestSerialize: (m) => Buffer.from(method.I.toBinary(m)),
        responseDeserialize: (b) => method.O.fromBinary(b),
        responseSerialize: (m) => Buffer.from(method.O.toBinary(m)),
      }
      this.grpcServices.set(method.service.typeName, serviceDefinition)

      // save the method info by full name for later use
      this.methodInfos.set(fullName, method)
    }

    for (const [serviceName, methods] of this.grpcServices.entries()) {
      debug('adding grpc service', serviceName, methods)
      this.grpcServer.addService(methods, createGrpcServiceImplementationProxy(this, serviceName))
    }

    debug('binding grpc server to 0.0.0.0:50051')
    this.grpcServer.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err) => {
      if (err) {
        console.error(err)
        process.exit(1337)
      }
      debug('grpc server bound to 0.0.0.0:50051')
      callback()
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  public _proxy_getHandler(serviceName: string, methodName: string): grpc.UntypedHandleCall | undefined {
    const fullName = `${serviceName}/${methodName}`
    const handler = this.messageHandlers.get(fullName)
    const methodInfo = this.methodInfos.get(fullName)
    if (!handler || !methodInfo) {
      return undefined
    }

    debug('creating context for method', fullName)
    const ctx = new GrpcTsContext(methodInfo, handler)
    return ctx._transport_getGrpcCall()
  }
}
