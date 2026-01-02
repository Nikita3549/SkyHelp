import { forwardRef, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ClaimModule } from '../claim.module';
import { UserModule } from '../../user/user.module';
import { RecentUpdatesModule } from '../recent-updates/recent-updates.module';
import { PartnerModule } from '../../referral/partner/partner.module';
import { OtherPassengerModule } from '../other-passenger/other-passenger.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        UserModule,
        RecentUpdatesModule,
        PartnerModule,
        OtherPassengerModule,
        ClaimPersistenceModule,
    ],
    controllers: [AdminController],
})
export class AdminModule {}
