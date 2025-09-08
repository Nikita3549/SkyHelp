import { forwardRef, Module } from '@nestjs/common';
import {
    OtherPassengerController,
    PublicOtherPassengerController,
} from './other-passenger.controller';
import { OtherPassengerService } from './other-passenger.service';
import { ClaimModule } from '../claim.module';
import { DocumentModule } from '../document/document.module';
import { TokenModule } from '../../token/token.module';
import { RecentUpdatesModule } from '../recent-updates/recent-updates.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        DocumentModule,
        TokenModule,
        RecentUpdatesModule,
    ],
    controllers: [OtherPassengerController, PublicOtherPassengerController],
    providers: [OtherPassengerService],
    exports: [OtherPassengerService],
})
export class OtherPassengerModule {}
