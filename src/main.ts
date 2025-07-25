import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SocketIoAdapter } from './common/adapters/socket-io.adapter';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bodyParser: false,
    });

    const configService = app.get(ConfigService);
    const port = configService.getOrThrow<number>('API_PORT');

    // HTTP CORS
    app.enableCors({
        origin: configService.getOrThrow<string>('FRONTEND_URL'),
        credentials: true,
    });

    // WS CORS
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

    app.use(
        '/v1/docusign/webhook',
        express.raw({ type: '*/*', limit: '100mb' }),
    );
    app.use(express.json({ limit: '10mb' }));

    await app.listen(port);
    console.log(`App is running on port ${port}`);
}
bootstrap();
