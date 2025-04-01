import { ConfigurableModuleBuilder } from '@nestjs/common'
import { RedisOptions } from 'ioredis'

export interface RedisModuleOptions {
  ioredis: RedisOptions
}

export const { ConfigurableModuleClass: RedisConfigurableModule, MODULE_OPTIONS_TOKEN: REDIS_MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<RedisModuleOptions>().setClassMethodName('forRoot').build()
