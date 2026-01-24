import { Module } from '@nestjs/common';
import { MeteoStatusService } from './meteo-status.service';
import { MeteoStatusController } from './meteo-status.controller';

@Module({
    providers: [MeteoStatusService],
    exports: [MeteoStatusService],
    controllers: [MeteoStatusController],
})
export class MeteoStatusModule {}
