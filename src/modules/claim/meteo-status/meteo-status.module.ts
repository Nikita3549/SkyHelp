import { Module } from '@nestjs/common';
import { MeteoStatusService } from './meteo-status.service';
import { MeteoStatusController } from './meteo-status.controller';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [ClaimPersistenceModule],
    providers: [MeteoStatusService],
    exports: [MeteoStatusService],
    controllers: [MeteoStatusController],
})
export class MeteoStatusModule {}
