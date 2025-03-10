import { ConfigurableModuleBuilder } from '@nestjs/common'
import * as grpc from '@grpc/grpc-js'

export interface GrpcTsModuleOptions {
  server: grpc.Server
}

export const { ConfigurableModuleClass: GrpcTsConfigurableModule, MODULE_OPTIONS_TOKEN: GRPC_TS_MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<GrpcTsModuleOptions>().build()
