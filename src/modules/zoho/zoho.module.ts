import { Module } from '@nestjs/common';
import { ZohoService } from './zoho.service';
import { ZohoController } from './zoho.controller';
import { ClaimModule } from '../claim/claim.module';
import { TokenModule } from '../token/token.module';
import { RedisModule } from '../redis/redis.module';
import { DocumentModule } from '../claim/document/document.module';
import { CustomerModule } from '../claim/customer/customer.module';
import { OtherPassengerModule } from '../claim/other-passenger/other-passenger.module';

@Module({
    imports: [
        ClaimModule,
        TokenModule,
        RedisModule,
        DocumentModule,
        CustomerModule,
        OtherPassengerModule,
    ],
    controllers: [ZohoController],
    providers: [ZohoService],
    exports: [ZohoService],
})
export class ZohoModule {}
