import { forwardRef, Module } from '@nestjs/common';
import {
    CustomerController,
    PublicCustomerController,
} from './customer.controller';
import { CustomerService } from './customer.service';
import { ClaimModule } from '../claim.module';
import { DocumentModule } from '../document/document.module';
import { TokenModule } from '../../token/token.module';
import { RecentUpdatesModule } from '../recent-updates/recent-updates.module';
import { DocumentRequestModule } from '../document-request/document-request.module';
import { NotificationModule } from '../../notification/notification.module';
import { GenerateLinksModule } from '../../generate-links/generate-links.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        forwardRef(() => DocumentModule),
        TokenModule,
        RecentUpdatesModule,
        forwardRef(() => DocumentRequestModule),
        forwardRef(() => GenerateLinksModule),
        forwardRef(() => NotificationModule),
    ],
    controllers: [CustomerController, PublicCustomerController],
    providers: [CustomerService],
    exports: [CustomerService],
})
export class CustomerModule {}
