import { Module } from '@nestjs/common';
import { ClaimsController, PublicClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { FlightsModule } from '../flights/flights.module';
import { TokenModule } from '../token/token.module';

@Module({
    imports: [FlightsModule, TokenModule],
    controllers: [ClaimsController, PublicClaimsController],
    providers: [ClaimsService],
})
export class ClaimsModule {}
