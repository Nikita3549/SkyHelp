import { Module } from '@nestjs/common';
import { ClaimController, PublicClaimController } from './claim.controller';
import { ClaimService } from './claim.service';
import { FlightModule } from '../flight/flight.module';
import { TokenModule } from '../token/token.module';
import { AirportModule } from '../airport/airport.module';
import { NotificationModule } from '../notification/notification.module';
import { BullModule } from '@nestjs/bullmq';
import {
    ADD_FLIGHT_STATUS_QUEUE_KEY,
    CLAIM_FOLLOWUP_QUEUE_KEY,
    CLAIM_REMINDER_QUEUE_KEY,
} from './constants';
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
import { EmailResumeClickModule } from '../email-resume-click/email-resume-click.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentRequestModule } from './document-request/document-request.module';
import { RecentUpdatesModule } from './recent-updates/recent-updates.module';
import { ActivityModule } from './activity/activity.module';
import { AirlineModule } from '../airline/airline.module';
import { BoardingPassModule } from './boarding-pass/boarding-pass.module';
import { AddFlightStatusProcessor } from './processors/add-flight-status.processor';
import { PartnerModule } from '../referral/partner/partner.module';
import { FlightStatusModule } from './flight-status/flight-status.module';
import { ClaimReminderProcessor } from './processors/claim-reminder.processor';
import { ClaimPersistenceModule } from '../claim-persistence/claim-persistence.module';
import { DuplicateModule } from './duplicate/duplicate.module';
import { GenerateLinksModule } from '../generate-links/generate-links.module';
import { StaffMessageModule } from './staff-message/staff-message.module';
import { MeteoStatusModule } from './meteo-status/meteo-status.module';

@Module({
    imports: [
        ClaimPersistenceModule,
        FlightModule,
        TokenModule,
        AirportModule,
        NotificationModule,
        BullModule.registerQueue(
            {
                name: CLAIM_FOLLOWUP_QUEUE_KEY,
            },
            {
                name: ADD_FLIGHT_STATUS_QUEUE_KEY,
            },
            {
                name: CLAIM_REMINDER_QUEUE_KEY,
            },
        ),
        ProgressModule,
        UserModule,
        AuthModule,
        DocumentModule,
        StateModule,
        CustomerModule,
        DetailModule,
        IssueModule,
        PaymentModule,
        OtherPassengerModule,
        AdminModule,
        EmailResumeClickModule,
        DocumentRequestModule,
        RecentUpdatesModule,
        ActivityModule,
        AirlineModule,
        BoardingPassModule,
        PartnerModule,
        FlightStatusModule,
        DuplicateModule,
        GenerateLinksModule,
        StaffMessageModule,
        MeteoStatusModule,
        MeteoStatusModule,
    ],
    controllers: [ClaimController, AdminController, PublicClaimController],
    providers: [
        ClaimService,
        ClaimFollowupProcessor,
        ClaimGateway,
        AddFlightStatusProcessor,
        ClaimReminderProcessor,
    ],
    exports: [ClaimService],
})
export class ClaimModule {}
