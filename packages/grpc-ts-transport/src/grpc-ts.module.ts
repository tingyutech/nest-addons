import { Module } from '@nestjs/common'
import {
  GRPC_TS_MODULE_OPTIONS_TOKEN,
  GrpcTsConfigurableModule,
  GrpcTsModuleOptions,
} from './grpc-ts.module-definition.js'
import { GrpcTsTransport } from './grpc-ts.transport.js'
import { readFile } from 'fs/promises'
import { loadFileDescriptorSetFromBuffer } from '@grpc/proto-loader'

@Module({
  providers: [
    {
      provide: GrpcTsTransport,
      useFactory: async (options: GrpcTsModuleOptions) => {
        const descriptorBuf: Buffer | undefined = options.descriptor
          ? typeof options.descriptor === 'string'
            ? await readFile(options.descriptor)
            : options.descriptor
          : undefined
        if (descriptorBuf) {
          const pkg = loadFileDescriptorSetFromBuffer(descriptorBuf)
          return new GrpcTsTransport(options.server, pkg)
        }
        return new GrpcTsTransport(options.server)
      },
      inject: [GRPC_TS_MODULE_OPTIONS_TOKEN],
    },
  ],
  exports: [GrpcTsTransport],
})
export class GrpcTsModule extends GrpcTsConfigurableModule {}
