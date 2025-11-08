import { Module } from '@nestjs/common';
import {
    GenerateLinksController,
    PublicGenerateLinksController,
} from './generate-links.controller';
import { GenerateLinksService } from './generate-links.service';
import { TokenModule } from '../token/token.module';
import { ClaimModule } from '../claim/claim.module';
import { OtherPassengerModule } from '../claim/other-passenger/other-passenger.module';
import { OtherPassengerCopiedLinksModule } from '../claim/other-passenger/other-passenger-copied-links/other-passenger-copied-links.module';
import { UrlShortenerModule } from './url-shortener/url-shortener.module';
import { CustomerModule } from '../claim/customer/customer.module';

@Module({
    imports: [
        TokenModule,
        ClaimModule,
        OtherPassengerModule,
        OtherPassengerCopiedLinksModule,
        UrlShortenerModule,
        CustomerModule,
    ],
    controllers: [GenerateLinksController, PublicGenerateLinksController],
    providers: [GenerateLinksService],
})
export class GenerateLinksModule {}
