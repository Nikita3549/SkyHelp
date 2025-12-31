import {
    BadRequestException,
    Body,
    Controller,
    NotFoundException,
    Param,
    Patch,
    Post,
    Put,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ClaimService } from '../claim.service';
import { CustomerDto } from './dto/customer.dto';
import {
    CLAIM_NOT_FOUND,
    CONTINUE_LINKS_EXP,
    CUSTOMER_NOT_FOUND,
    INVALID_JWT,
} from '../constants';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { UploadSignDto } from './dto/upload-sign.dto';
import { DocumentService } from '../document/services/document.service';
import {
    ClaimStatus,
    DocumentRequestStatus,
    PassengerPaymentStatus,
    UserRole,
} from '@prisma/client';
import { TokenService } from '../../token/token.service';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import { DocumentRequestService } from '../document-request/document-request.service';
import { RoleGuard } from '../../../common/guards/role.guard';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { GenerateLinksService } from '../../generate-links/generate-links.service';
import { NotificationService } from '../../notification/services/notification.service';
import { Languages } from '../../language/enums/languages.enums';

@Controller('claims/customer')
@UseGuards(JwtAuthGuard)
export class CustomerController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly claimService: ClaimService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly tokenService: TokenService,
        private readonly notificationService: NotificationService,
        private readonly documentService: DocumentService,
    ) {}

    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
    @Put('admin')
    async updateCustomer(@Body() dto: CustomerDto) {
        const { claimId } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        const customer = await this.customerService.updateCustomer(
            dto,
            claimId,
        );

        await this.claimService.changeUpdatedAt(claimId);
        await this.documentService.updateAssignmentData(claim.id, [
            claim.customer.id,
        ]);

        return customer;
    }

    @Patch(':customerId/payment-status')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.AGENT,
            UserRole.LAWYER,
            UserRole.ACCOUNTANT,
        ]),
    )
    async updatePaymentStatus(
        @Param('customerId') customerId: string,
        @Body() dto: UpdatePaymentStatusDto,
    ) {
        const { paymentStatus } = dto;

        const customer = await this.customerService.getCustomer(customerId);

        if (!customer) {
            throw new NotFoundException(CUSTOMER_NOT_FOUND);
        }

        if (paymentStatus == PassengerPaymentStatus.FAILED) {
            const linkJwt = this.tokenService.generateJWT(
                {
                    claimId: customer.Claim[0].id,
                },
                { expiresIn: CONTINUE_LINKS_EXP },
            );

            const paymentDetailsLink =
                await this.generateLinksService.generatePaymentDetails(linkJwt);

            await this.notificationService.sendPaymentRequest(
                customer.email,
                {
                    customerName: customer.firstName,
                    claimId: customer.Claim[0].id,
                    paymentDetailsLink,
                },
                Languages.EN,
            );

            await this.claimService.updateStatus(
                ClaimStatus.PAYMENT_FAILED,
                customer.Claim[0].id,
            );
        }
        return await this.customerService.updatePaymentStatus(
            paymentStatus,
            customerId,
        );
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

        await this.documentService.saveSignature(
            {
                imageDataUrl: signature,
            },
            {
                claim: claim,
                passenger: {
                    ...claim.customer,
                    isCustomer: true,
                    claimId: claim.id,
                    isMinor: false,
                },
            },
            {
                saveRecentUpdate: true,
                checkIfAllDocumentsUploaded: true,
            },
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

        await this.customerService.setIsSignedCustomer(customerId, true);
    }
}
