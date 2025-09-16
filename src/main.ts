import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SocketIoAdapter } from './common/adapters/socket-io.adapter';
import * as express from 'express';
import { isProd } from './utils/isProd';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: false,
    });

    const configService = app.get(ConfigService);
    const port = configService.getOrThrow<number>('API_PORT');

    if (isProd()) {
        app.enableCors({
            origin: configService.getOrThrow<string>('FRONTEND_URL'),
            credentials: true,
        });
    } else {
        // Allow each sources in dev
        app.enableCors({
            origin: true,
            credentials: true,
        });
    }

    // WS CORS
    isProd() &&
        app.useWebSocketAdapter(new SocketIoAdapter(app, configService));

    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    app.use('/v1/zoho/webhook', express.raw({ type: '*/*', limit: '100mb' }));
    app.use(express.json({ limit: '10mb' }));

    await app.listen(port);
    console.log(`App is running on port ${port}`);
}

bootstrap();
