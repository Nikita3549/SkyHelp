import { Module } from '@nestjs/common';
import { BoardingPassService } from './boarding-pass.service';
import { BoardingPassController } from './boarding-pass.controller';
import { BoardingPassGateway } from './gateways/boarding-pass.gateway';
import { AirlineModule } from '../../airline/airline.module';
import { AirportModule } from '../../airport/airport.module';
import { BoardingPassScanGateway } from './gateways/boarding-pass-scan.gateway';

@Module({
    imports: [AirlineModule, AirportModule],
    providers: [
        BoardingPassService,
        BoardingPassGateway,
        BoardingPassScanGateway,
    ],
    controllers: [BoardingPassController],
})
export class BoardingPassModule {}
