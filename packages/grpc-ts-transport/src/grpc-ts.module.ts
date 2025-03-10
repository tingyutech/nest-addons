import { Module } from '@nestjs/common'
import {
  GRPC_TS_MODULE_OPTIONS_TOKEN,
  GrpcTsConfigurableModule,
  GrpcTsModuleOptions,
} from './grpc-ts.module-definition.js'
import { GrpcTsTransport } from './grpc-ts.transport.js'

@Module({
  providers: [
    {
      provide: GrpcTsTransport,
      useFactory: (options: GrpcTsModuleOptions) => new GrpcTsTransport(options.server),
      inject: [GRPC_TS_MODULE_OPTIONS_TOKEN],
    },
  ],
  exports: [GrpcTsTransport],
})
export class GrpcTsModule extends GrpcTsConfigurableModule {}
