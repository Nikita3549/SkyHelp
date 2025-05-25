import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.getOrThrow<number>('PORT');

    await app.listen(process.env.PORT ?? 3000);
    console.log(`App is running on port ${port}`);
}
bootstrap();
