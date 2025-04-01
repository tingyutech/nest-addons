import { Module } from '@nestjs/common'
import { RedisConfigurableModule } from './redis.module-definition.js'
import { IoRedisService } from './ioredis.service.js'

@Module({
  providers: [IoRedisService],
  exports: [IoRedisService],
})
export class NestRedisModule extends RedisConfigurableModule {}
