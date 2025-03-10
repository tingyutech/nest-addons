import { UntypedServiceImplementation } from '@grpc/grpc-js'
import { GrpcTsTransport } from '../grpc-ts.transport.js'

export function createGrpcServiceImplementationProxy(
  transport: GrpcTsTransport,
  serviceName: string,
): UntypedServiceImplementation {
  return new Proxy(
    {},
    {
      get(target, prop, receiver) {
        if (typeof prop !== 'string') {
          return undefined
        }

        return transport._proxy_getHandler(serviceName, prop)
      },
    },
  )
}
