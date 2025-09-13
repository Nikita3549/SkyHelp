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

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        DocumentModule,
        TokenModule,
        RecentUpdatesModule,
        DocumentRequestModule,
    ],
    controllers: [CustomerController, PublicCustomerController],
    providers: [CustomerService],
    exports: [CustomerService],
})
export class CustomerModule {}
