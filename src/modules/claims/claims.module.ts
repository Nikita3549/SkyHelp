import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { FlightsModule } from '../flights/flights.module';

@Module({
    imports: [FlightsModule],
    controllers: [ClaimsController],
    providers: [ClaimsService],
})
export class ClaimsModule {}
