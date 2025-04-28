import {
  ClientStreamingCall,
  DuplexStreamingCall,
  RpcMetadata,
  RpcStatus,
  ServerStreamingCall,
  ServiceInfo,
  UnaryCall,
} from '@protobuf-ts/runtime-rpc'

export class GrpcStatusError extends Error {
  public constructor(
    public readonly message: string,
    public readonly status: RpcStatus,
    public readonly trailers: RpcMetadata,
  ) {
    super(message)
  }
}

export type SafeClient<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => UnaryCall<any, infer R>
    ? (...args: A) => Promise<R>
    : T[K] extends (...args: infer Args) => ServerStreamingCall<infer I, infer O>
      ? (...args: Args) => ServerStreamingCall<I, O>
      : T[K] extends (...args: infer Args) => DuplexStreamingCall<infer I, infer O>
        ? (...args: Args) => DuplexStreamingCall<I, O>
        : never
}

export function createSafeClient<T extends ServiceInfo>(client: T): SafeClient<T> {
  const newC = {} as any
  for (const method of client.methods) {
    newC[method.localName] = (...args: any) => {
      const call: UnaryCall | ServerStreamingCall | ClientStreamingCall | DuplexStreamingCall = (client as any)[
        method.localName
      ](...args)
      if (call instanceof UnaryCall || call instanceof ClientStreamingCall) {
        // prevent unhandled promise rejection
        call.headers.catch(() => void 0)
        call.response.catch(() => void 0)
        call.trailers.catch(() => void 0)

        return call.status.then(async (status) => {
          if (status.code !== '0' && status.code !== 'OK') {
            const trailers = await call.trailers
            throw new GrpcStatusError(status.detail, status, trailers)
          }
          return call.response
        })
      } else {
        return call
      }
    }
  }
  return newC
}
