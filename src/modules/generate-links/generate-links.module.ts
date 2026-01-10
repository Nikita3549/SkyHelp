import { Module } from '@nestjs/common';
import {
    GenerateLinksController,
    PublicGenerateLinksController,
} from './generate-links.controller';
import { GenerateLinksService } from './generate-links.service';
import { TokenModule } from '../token/token.module';
import { OtherPassengerModule } from '../claim/other-passenger/other-passenger.module';
import { OtherPassengerCopiedLinksModule } from '../claim/other-passenger/other-passenger-copied-links/other-passenger-copied-links.module';
import { UrlShortenerModule } from './url-shortener/url-shortener.module';
import { CustomerModule } from '../claim/customer/customer.module';
import { ClaimPersistenceModule } from '../claim-persistence/claim-persistence.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        TokenModule,
        OtherPassengerModule,
        OtherPassengerCopiedLinksModule,
        UrlShortenerModule,
        CustomerModule,
        ClaimPersistenceModule,
        AuthModule,
        UserModule,
    ],
    controllers: [GenerateLinksController, PublicGenerateLinksController],
    providers: [GenerateLinksService],
    exports: [GenerateLinksService],
})
export class GenerateLinksModule {}
