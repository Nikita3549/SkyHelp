import { forwardRef, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserModule } from '../../user/user.module';
import { RecentUpdatesModule } from '../recent-updates/recent-updates.module';
import { PartnerModule } from '../../referral/partner/partner.module';
import { OtherPassengerModule } from '../other-passenger/other-passenger.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';
import { DuplicateModule } from '../duplicate/duplicate.module';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [
        UserModule,
        RecentUpdatesModule,
        PartnerModule,
        OtherPassengerModule,
        ClaimPersistenceModule,
        DuplicateModule,
        forwardRef(() => ClaimModule),
    ],
    controllers: [AdminController],
})
export class AdminModule {}
