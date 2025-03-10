import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { inspect } from 'util'
import { AppModule } from './app/app.module.js'

async function bootstrap() {
  inspect.defaultOptions.depth = 10
  const command = process.argv[2] ?? 'api'
  if (command === 'migrate') {
    // const app = await NestFactory.create<NestFastifyApplication>(DatabaseModule, new FastifyAdapter())
    // const db = await app.resolve(DatabaseService)
    // await db.migrate()
    // await app.close()
    // process.exit(0)
  } else if (command === 'api') {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())
    app.enableShutdownHooks()
    app.setGlobalPrefix('api')
    await app.init()

    await app.listen(5300, '0.0.0.0')
  } else {
    console.log(`unknown command ${command}`)
    process.exit(233)
  }
}

bootstrap().catch(console.error)
