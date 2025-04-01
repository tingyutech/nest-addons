import { Metadata } from '@grpc/grpc-js'
import * as grpc from '@grpc/grpc-js'
import { MessageHandler } from '@nestjs/microservices'
import { MethodInfo } from '@protobuf-ts/runtime-rpc'
import { firstValueFrom, isObservable, Observable, ReplaySubject } from 'rxjs'
import { fromPromise } from 'rxjs/internal/observable/innerFrom'
import createDebug from 'debug'
import type { ObjectReadable, ObjectWritable } from '@grpc/grpc-js/build/src/object-stream.js'
import type { ServerSurfaceCall } from '@grpc/grpc-js/build/src/server-call.js'
import { GrpcTsDomainError } from './grpc-ts-domain-error.js'
import { Status } from './pb/google/rpc/status.js'
import { ErrorInfo } from './pb/google/rpc/error_details.js'

const debug = createDebug('grpc-ts-transport:context')

export class GrpcTsContext<I extends object = any, O extends object = any> {
  private unaryCall?: grpc.ServerUnaryCall<I, O>
  private clientStreamingCall?: grpc.ServerReadableStream<I, O>
  private serverStreamingCall?: grpc.ServerWritableStream<I, O>
  private bidiStreamingCall?: grpc.ServerDuplexStream<I, O>

  private headersSent = false

  public userData: Record<string | symbol, any> = {}

  public readonly trailers: Metadata = new Metadata()
  public readonly headers: Metadata = new Metadata()

  public requestMetadata: Metadata = new Metadata()

  public constructor(
    public readonly methodInfo: MethodInfo<I, O>,
    public readonly nestHandler: MessageHandler<I | Observable<I>, GrpcTsContext<I, O>>,
  ) {}

  public _transport_getGrpcCall(): grpc.UntypedHandleCall {
    if (!this.methodInfo.clientStreaming) {
      if (!this.methodInfo.serverStreaming) {
        return this.handleUnaryCall
      } else {
        return this.handleServerStreamingCall
      }
    } else {
      if (!this.methodInfo.serverStreaming) {
        return this.handleBidiStreamingCall
      } else {
        return this.handleClientStreamingCall
      }
    }
  }

  private transformError(err: Error): grpc.ServerErrorResponse {
    // TODO: transform error
    debug('original error', err)
    if (err instanceof GrpcTsDomainError) {
      this.trailers.set('gt-error-code', `${err.domain}:${err.code}`)
      const status = {
        code: err.status,
        message: err.message,
        details: [
          {
            typeUrl: 'type.googleapis.com/google.rpc.ErrorInfo',
            value: ErrorInfo.toBinary({
              reason: err.code,
              domain: err.domain,
              metadata: {},
            } satisfies ErrorInfo),
          },
        ],
      } satisfies Status
      this.trailers.set('grpc-status-details-bin', Buffer.from(Status.toBinary(status)))

      return {
        code: err.status,
        details: err.message,
        name: err.code,
        message: err.message,
        metadata: this.trailers,
      }
    }
    return {
      code: grpc.status.INTERNAL,
      details: err.message,
      name: err.name,
      message: err.message,
      metadata: this.trailers,
    }
  }

  public sendHeaders() {
    if (this.headersSent) {
      return
    }

    if (this.unaryCall) {
      this.unaryCall.sendMetadata(this.headers)
      this.headersSent = true
    } else if (this.clientStreamingCall) {
      this.clientStreamingCall.sendMetadata(this.headers)
      this.headersSent = true
    } else if (this.serverStreamingCall) {
      this.serverStreamingCall.sendMetadata(this.headers)
      this.headersSent = true
    } else if (this.bidiStreamingCall) {
      this.bidiStreamingCall.sendMetadata(this.headers)
      this.headersSent = true
    }
  }

  private handleUnaryCall: grpc.handleUnaryCall<I, O> = (call, callback) => {
    this.unaryCall = call
    this.requestMetadata = call.metadata
    const result = this.nestHandler(call.request, this)
    this.callbackResult(result, callback)
  }

  private handleClientStreamingCall: grpc.handleClientStreamingCall<I, O> = (call, callback) => {
    this.clientStreamingCall = call
    this.requestMetadata = call.metadata
    const clientRequest$ = this.clientStreamToObservable(call)
    const result = this.nestHandler(clientRequest$, this)
    this.callbackResult(result, callback)
  }

  private handleServerStreamingCall: grpc.handleServerStreamingCall<I, O> = (call) => {
    this.serverStreamingCall = call
    this.requestMetadata = call.metadata
    const result = this.nestHandler(call.request, this)
    this.streamResult(result, call)
  }

  private handleBidiStreamingCall: grpc.handleBidiStreamingCall<I, O> = (call) => {
    this.bidiStreamingCall = call
    this.requestMetadata = call.metadata
    const clientRequest$ = this.clientStreamToObservable(call)
    const result = this.nestHandler(clientRequest$, this)
    this.streamResult(result, call)
  }

  private clientStreamToObservable(call: ObjectReadable<I>): Observable<I> {
    const clientRequests = new ReplaySubject<I>()
    call.on('data', (request) => {
      clientRequests.next(request)
    })
    call.on('end', () => {
      clientRequests.complete()
    })
    call.on('error', (err) => {
      clientRequests.error(err)
    })
    return clientRequests
  }

  private callbackResult(result: Promise<O | Observable<O>>, callback: grpc.sendUnaryData<O>) {
    result
      .then((v) => (isObservable(v) ? firstValueFrom(v) : v))
      .then(
        (result) => {
          this.sendHeaders()
          callback(null, result, this.trailers)
        },
        (err) => {
          callback(this.transformError(err), null, this.trailers)
        },
      )
  }

  private streamResult(
    result: Promise<O> | Promise<Observable<O>> | Promise<void>,
    ssCall: ServerSurfaceCall &
      ObjectWritable<O> & {
        end: (trailers?: Metadata) => void
      },
  ) {
    result
      .then((v) => (v ? (isObservable(v) ? v : fromPromise(Promise.resolve(v))) : null))
      .then(
        (response$) => {
          if (response$ == null) {
            // just ignore it
            debug('no value returned from handler, wont handle any response')
            return
          }

          this.sendHeaders()
          response$.subscribe({
            next: (v) => ssCall.write(v),
            error: (err) => ssCall.emit('error', this.transformError(err)),
            complete: () => ssCall.end(this.trailers),
          })
        },
        (err) => {
          ssCall.emit('error', this.transformError(err))
        },
      )
  }
}
