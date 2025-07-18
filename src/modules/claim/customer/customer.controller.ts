import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { ClaimService } from '../claim.service';
import { IsModeratorGuard } from '../../../guards/isModerator.guard';
import { CustomerDto } from './dto/customer.dto';
import { INVALID_CLAIM_ID, INVALID_CUSTOMER_ID } from '../constants';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { UploadSignDto } from './dto/upload-sign.dto';
import { DocumentService } from '../document/document.service';

@Controller('claims/customer')
@UseGuards(JwtAuthGuard)
export class CustomerController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(IsModeratorGuard)
    @Put('/admin/')
    async updateCustomer(@Body() dto: CustomerDto) {
        const { claimId } = dto;

        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimService.changeUpdatedAt(claimId);

        return await this.customerService.updateCustomer(dto, claimId);
    }
}

@Controller('claims/customer')
export class PublicCustomerController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly claimService: ClaimService,
        private readonly documentService: DocumentService,
    ) {}

    @Get(':customerId')
    async getCustomer(@Param('customerId') customerId: string) {
        const customer = await this.customerService.getCustomer(customerId);

        if (!customer) {
            throw new NotFoundException(INVALID_CUSTOMER_ID);
        }

        return customer;
    }

    @Post(':customerId/sign')
    async uploadCustomerSign(
        @Body() dto: UploadSignDto,
        @Param('customerId') customerId: string,
    ) {
        const { signature, claimId } = dto;

        const customer = await this.customerService.getCustomer(customerId);

        if (!customer) {
            throw new NotFoundException(INVALID_CUSTOMER_ID);
        }

        if (customer.isSigned) {
            return;
        }

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        const path = await this.documentService.saveSignaturePdf(signature, {
            firstName: customer.firstName,
            lastName: customer.lastName,
            flightNumber: claim.details.flightNumber,
            date: claim.details.date,
            address: customer.address,
            claimId: claim.id,
            airlineName: claim.details.airlines.name,
        });

        await this.documentService.saveDocuments(
            [
                {
                    path,
                    name: `${customer.firstName}_${customer.lastName}-assignment_agreement.pdf`,
                },
            ],
            claimId,
        );

        await this.customerService.setIsSignedCustomer(claim.customerId, true);

        await this.customerService.setIsSignedCustomer(customerId, true);
    }
}
