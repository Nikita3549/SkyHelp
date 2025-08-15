import { forwardRef, Module } from '@nestjs/common';
import { ClaimController, PublicClaimController } from './claim.controller';
import { ClaimService } from './claim.service';
import { FlightModule } from '../flight/flight.module';
import { TokenModule } from '../token/token.module';
import { AirportModule } from '../airport/airport.module';
import { NotificationModule } from '../notification/notification.module';
import { BullModule } from '@nestjs/bullmq';
import { CLAIM_QUEUE_KEY } from './constants';
import { ClaimFollowupProcessor } from './processors/claim-followup.processor';
import { ProgressModule } from './progress/progress.module';
import { DocumentModule } from './document/document.module';
import { StateModule } from './state/state.module';
import { CustomerModule } from './customer/customer.module';
import { DetailModule } from './detail/detail.module';
import { IssueModule } from './issue/issue.module';
import { PaymentModule } from './payment/payment.module';
import { OtherPassengerModule } from './other-passenger/other-passenger.module';
import { AdminModule } from './admin/admin.module';
import { AdminController } from './admin/admin.controller';
import { ClaimGateway } from './claim.gateway';

@Module({
    imports: [
        FlightModule,
        TokenModule,
        AirportModule,
        ClaimModule,
        forwardRef(() => NotificationModule),
        BullModule.registerQueue({
            name: CLAIM_QUEUE_KEY,
        }),
        ProgressModule,
        forwardRef(() => DocumentModule),
        forwardRef(() => StateModule),
        forwardRef(() => CustomerModule),
        forwardRef(() => DetailModule),
        forwardRef(() => IssueModule),
        forwardRef(() => PaymentModule),
        forwardRef(() => OtherPassengerModule),
        forwardRef(() => AdminModule),
    ],
    controllers: [ClaimController, AdminController, PublicClaimController],
    providers: [ClaimService, ClaimFollowupProcessor, ClaimGateway],
    exports: [ClaimService],
})
export class ClaimModule {}
