import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ClaimService } from '../claim.service';
import { CustomerDto } from './dto/customer.dto';
import { CLAIM_NOT_FOUND, CUSTOMER_NOT_FOUND, INVALID_JWT } from '../constants';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { UploadSignDto } from './dto/upload-sign.dto';
import { DocumentService } from '../document/document.service';
import {
    ClaimRecentUpdatesType,
    DocumentRequestStatus,
    DocumentType,
} from '@prisma/client';
import { validateClaimJwt } from '../../../utils/validate-claim-jwt';
import { TokenService } from '../../token/token.service';
import { IsAgentGuard } from '../../../guards/isAgent.guard';
import { generateAssignmentName } from '../../../utils/generate-assignment-name';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import { DocumentRequestService } from '../document-request/document-request.service';

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
            throw new BadRequestException(CLAIM_NOT_FOUND);
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
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly documentRequestService: DocumentRequestService,
    ) {}

    @Post(':customerId/sign')
    async uploadCustomerSign(
        @Body() dto: UploadSignDto,
        @Param('customerId') customerId: string,
    ) {
        const { signature, jwt, documentRequestId } = dto;

        const token = await this.tokenService.verifyJWT(jwt).catch((_e) => {
            throw new UnauthorizedException(INVALID_JWT);
        });

        await this.tokenService.revokeJwt(token);

        const customer = await this.customerService.getCustomer(customerId);

        if (!customer) {
            throw new NotFoundException(CUSTOMER_NOT_FOUND);
        }

        const claim = await this.claimService.getClaim(customer.Claim[0].id);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
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

        const documents = await this.documentService.saveDocuments(
            [
                {
                    path,
                    name: generateAssignmentName(
                        customer.firstName,
                        customer.lastName,
                    ),
                    passengerId: claim.customer.id,
                    documentType: DocumentType.ASSIGNMENT,
                },
            ],
            customer.Claim[0].id,
            true,
        );

        if (documentRequestId) {
            const documentRequest =
                await this.documentRequestService.getById(documentRequestId);

            if (documentRequest) {
                await this.documentRequestService.updateStatus(
                    documentRequestId,
                    DocumentRequestStatus.INACTIVE,
                );
            }
        }

        documents.forEach((doc) => {
            this.recentUpdatesService.saveRecentUpdate(
                {
                    type: ClaimRecentUpdatesType.DOCUMENT,
                    updatedEntityId: doc.id,
                    entityData: doc.name,
                },
                customer.Claim[0].id,
            );
        });

        await this.customerService.setIsSignedCustomer(customerId, true);
    }
}
