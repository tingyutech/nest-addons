import { Global, Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () =>
        process.env.NODE_ENV === 'production'
          ? {
              pinoHttp: {
                level: 'info',
              },
            }
          : {
              pinoHttp: {
                level: 'trace',
                transport: {
                  target: 'pino-pretty',
                  options: {
                    ignore: 'pid,hostname,context',
                    sync: true,
                    messageFormat: '[{context}] {msg}',
                  },
                },
              },
            },
    }),
  ],
})
export class NestPinoModule {}
