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
import { CustomerDto } from './dto/customer.dto';
import { INVALID_CLAIM_ID, INVALID_CUSTOMER_ID } from '../constants';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { UploadSignDto } from './dto/upload-sign.dto';
import { DocumentService } from '../document/document.service';
import { DocumentType } from '@prisma/client';
import { validateClaimJwt } from '../../../utils/validate-claim-jwt';
import { TokenService } from '../../token/token.service';
import { IsAgentGuard } from '../../../guards/isAgent.guard';

@Controller('claims/customer')
@UseGuards(JwtAuthGuard)
export class CustomerController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(IsAgentGuard)
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
        private readonly tokenService: TokenService,
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
        const { signature, claimId, jwt } = dto;

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const customer = await this.customerService.getCustomer(customerId);

        if (!customer) {
            throw new NotFoundException(INVALID_CUSTOMER_ID);
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
            DocumentType.ASSIGNMENT,
        );

        await this.customerService.setIsSignedCustomer(customerId, true);
    }
}
