import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { REDIS_MODULE_OPTIONS_TOKEN, RedisModuleOptions } from './redis.module-definition.js'
import { Redis } from 'ioredis'

@Injectable()
export class IoRedisService implements OnModuleInit, OnModuleDestroy {
  public readonly client: Redis

  public constructor(@Inject(REDIS_MODULE_OPTIONS_TOKEN) private readonly options: RedisModuleOptions) {
    this.client = new Redis({ lazyConnect: true, ...options.ioredis })
  }

  public async onModuleInit() {
    await this.client.connect()
  }

  public async onModuleDestroy() {
    await this.client.quit()
  }
}
