import { forwardRef, Module } from '@nestjs/common';
import {
    CustomerController,
    PublicCustomerController,
} from './customer.controller';
import { CustomerService } from './customer.service';
import { ClaimModule } from '../claim.module';
import { DocumentModule } from '../document/document.module';

@Module({
    imports: [forwardRef(() => ClaimModule), DocumentModule],
    controllers: [CustomerController, PublicCustomerController],
    providers: [CustomerService],
    exports: [CustomerService],
})
export class CustomerModule {}
