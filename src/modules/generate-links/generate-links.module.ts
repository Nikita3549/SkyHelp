import { forwardRef, Module } from '@nestjs/common';
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
import { ClaimModule } from '../claim/claim.module';

@Module({
    imports: [
        forwardRef(() => TokenModule),
        forwardRef(() => ClaimModule),
        OtherPassengerModule,
        OtherPassengerCopiedLinksModule,
        UrlShortenerModule,
        forwardRef(() => CustomerModule),
    ],
    controllers: [GenerateLinksController, PublicGenerateLinksController],
    providers: [GenerateLinksService],
    exports: [GenerateLinksService],
})
export class GenerateLinksModule {}
