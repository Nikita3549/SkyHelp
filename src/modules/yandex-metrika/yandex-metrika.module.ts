import { Module } from '@nestjs/common';
import { YandexMetrikaService } from './yandex-metrika.service';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';

@Module({
    imports: [GoogleSheetsModule],
    providers: [YandexMetrikaService],
})
export class YandexMetrikaModule {}
