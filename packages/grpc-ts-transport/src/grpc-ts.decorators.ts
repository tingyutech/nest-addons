import { Controller, createParamDecorator, ExecutionContext } from '@nestjs/common'
import { MessagePattern } from '@nestjs/microservices'
import { MethodInfo } from '@protobuf-ts/runtime-rpc'
import type { Observable } from 'rxjs'
import { GrpcTsContext } from './grpc-ts.context.js'
import { GRPC_TS_TRANSPORT } from './grpc-ts.symbol.js'
import { getFullName } from './internal/get-full-name.js'

export type UnaryMethodHandler<I extends object = any, O extends object = any> = (
  payload: I,
  ...args: any[]
) => Promise<O>
export type ClientStreamingMethodHandler<I extends object = any, O extends object = any> = (
  payload: Observable<I>,
  ...args: any[]
) => Promise<O>
export type ServerStreamingMethodHandler<I extends object = any, O extends object = any> = (
  payload: I,
  ...args: any[]
) => Observable<O>
export type BidiStreamingMethodHandler<I extends object = any, O extends object = any> = (
  payload: Observable<I>,
  ...args: any[]
) => Observable<O>
export type GrpcMethodHandler<I extends object = any, O extends object = any> =
  | UnaryMethodHandler<I, O>
  | ClientStreamingMethodHandler<I, O>
  | ServerStreamingMethodHandler<I, O>
  | BidiStreamingMethodHandler<I, O>

type TypedMethodDecorator<T> = (
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void

export function GrpcTsService(): ClassDecorator {
  return (target) => {
    Controller()(target)
  }
}

export interface GrpcTsMethodExtras {
  methodInfo: MethodInfo<any, any>
}

export function GrpcTsMethod<I extends object = any, O extends object = any>(
  methodInfo: MethodInfo<I, O>,
): TypedMethodDecorator<GrpcMethodHandler<I, O>> {
  return (target, propertyKey, descriptor) => {
    MessagePattern(getFullName(methodInfo), GRPC_TS_TRANSPORT, {
      methodInfo,
    } as GrpcTsMethodExtras)(target, propertyKey, descriptor)
  }
}

export function UnaryMethod<I extends object = any, O extends object = any>(
  methodInfo: MethodInfo<I, O>,
): TypedMethodDecorator<UnaryMethodHandler<I, O>> {
  return GrpcTsMethod(methodInfo) as TypedMethodDecorator<UnaryMethodHandler<I, O>>
}

export function ClientStreamingMethod<I extends object = any, O extends object = any>(
  methodInfo: MethodInfo<I, O>,
): TypedMethodDecorator<ClientStreamingMethodHandler<I, O>> {
  return GrpcTsMethod(methodInfo) as TypedMethodDecorator<ClientStreamingMethodHandler<I, O>>
}

export function ServerStreamingMethod<I extends object = any, O extends object = any>(
  methodInfo: MethodInfo<I, O>,
): TypedMethodDecorator<ServerStreamingMethodHandler<I, O>> {
  return GrpcTsMethod(methodInfo) as TypedMethodDecorator<ServerStreamingMethodHandler<I, O>>
}

export function BidiStreamingMethod<I extends object = any, O extends object = any>(
  methodInfo: MethodInfo<I, O>,
): TypedMethodDecorator<BidiStreamingMethodHandler<I, O>> {
  return GrpcTsMethod(methodInfo) as TypedMethodDecorator<BidiStreamingMethodHandler<I, O>>
}

export const GrpcTsCtx = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const grpcTsCtx = ctx.switchToRpc().getContext<GrpcTsContext<any, any>>()
  return grpcTsCtx
})
