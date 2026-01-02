import { forwardRef, Module } from '@nestjs/common';
import { OtherPassengerController } from './controllers/other-passenger.controller';
import { OtherPassengerService } from './other-passenger.service';
import { ClaimModule } from '../claim.module';
import { DocumentModule } from '../document/document.module';
import { TokenModule } from '../../token/token.module';
import { RecentUpdatesModule } from '../recent-updates/recent-updates.module';
import { DocumentRequestModule } from '../document-request/document-request.module';
import { OtherPassengerCopiedLinksModule } from './other-passenger-copied-links/other-passenger-copied-links.module';
import { NotificationModule } from '../../notification/notification.module';
import { GenerateLinksModule } from '../../generate-links/generate-links.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';
import { PublicOtherPassengerController } from './controllers/public-other-passenger.controller';

@Module({
    imports: [
        forwardRef(() => DocumentModule),
        TokenModule,
        RecentUpdatesModule,
        forwardRef(() => DocumentRequestModule),
        OtherPassengerCopiedLinksModule,
        NotificationModule,
        forwardRef(() => GenerateLinksModule),
        ClaimPersistenceModule,
    ],
    controllers: [OtherPassengerController, PublicOtherPassengerController],
    providers: [OtherPassengerService],
    exports: [OtherPassengerService],
})
export class OtherPassengerModule {}
