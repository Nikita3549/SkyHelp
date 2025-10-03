import { Module } from '@nestjs/common';
import { BoardingPassService } from './boarding-pass.service';
import { BoardingPassController } from './boarding-pass.controller';
import { BoardingPassGateway } from './boarding-pass.gateway';
import { AirlineModule } from '../../airline/airline.module';
import { AirportModule } from '../../airport/airport.module';

@Module({
    imports: [AirlineModule, AirportModule],
    providers: [BoardingPassService, BoardingPassGateway],
    controllers: [BoardingPassController],
})
export class BoardingPassModule {}
