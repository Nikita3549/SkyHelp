import {
    BadRequestException,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Post,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwtAuth.guard';
import { TokenService } from '../token/token.service';
import { GenerateLinksService } from './generate-links.service';
import {
    PublicSignOtherPassengerDto,
    PublicUploadDocumentsDto,
    SignCustomerDto,
    UploadDocumentsDto,
} from './dto/generate-links.dto';
import {
    CLAIM_NOT_FOUND,
    HAVE_NO_RIGHTS_ON_CLAIM,
    INVALID_JWT,
    PASSENGER_NOT_FOUND,
} from '../claim/constants';
import { AuthRequest } from '../../common/interfaces/AuthRequest.interface';
import {
    DocumentType,
    OtherPassengerCopiedLinkType,
    UserRole,
} from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { OtherPassengerService } from '../claim/other-passenger/other-passenger.service';
import { OtherPassengerCopiedLinksService } from '../claim/other-passenger/other-passenger-copied-links/other-passenger-copied-links.service';
import { CustomerService } from '../claim/customer/customer.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { ClaimPersistenceService } from '../claim-persistence/services/claim-persistence.service';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class GenerateLinksController {
    constructor(
        private readonly generateLinksService: GenerateLinksService,
        private readonly otherPassengerService: OtherPassengerService,
        private readonly otherPassengerCopiedLinksService: OtherPassengerCopiedLinksService,
        private readonly customerService: CustomerService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
            UserRole.ACCOUNTANT,
        ]),
    )
    @Get('upload-documents')
    async copyUploadDocuments(
        @Query() query: UploadDocumentsDto,
        @Req() req: AuthRequest,
    ) {
        if (req.user.role == UserRole.CLIENT) {
            const claim = await this.claimPersistenceService.findOneById(
                query.claimId,
            );

            if (!claim) {
                throw new NotFoundException(CLAIM_NOT_FOUND);
            }

            if (claim.userId != req.user.id) {
                throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
            }
        }

        const passenger = await this.otherPassengerService.getOtherPassenger(
            query.passengerId,
        );
        const customer = await this.customerService.getCustomer(
            query.passengerId,
        );

        let jwt: string;
        if (passenger) {
            jwt = await this.generateLinksService.continueJwtLink(
                query.claimId,
                {
                    id: passenger.id,
                    copiedLinkType: OtherPassengerCopiedLinkType.DOCUMENT,
                },
            );

            await this.otherPassengerCopiedLinksService.createIfNotExist(
                passenger.id,
                false,
                OtherPassengerCopiedLinkType.DOCUMENT,
            );
        } else if (customer) {
            jwt = await this.generateLinksService.continueJwtLink(
                query.claimId,
            );
        } else {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        let passengerName = passenger
            ? `${passenger.firstName} ${passenger.lastName}`
            : `${customer!.firstName} ${customer!.lastName}`;

        const link = await this.generateLinksService.uploadDocuments(
            query.passengerId,
            query.claimId,
            jwt,
            JSON.stringify({
                documentTypes: [DocumentType.DOCUMENT, DocumentType.ETICKET],
            }),
            passengerName,
        );
        return { link };
    }

    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
            UserRole.ACCOUNTANT,
        ]),
    )
    @Get('upload-passport')
    async copyUploadPassport(
        @Query() query: UploadDocumentsDto,
        @Req() req: AuthRequest,
    ) {
        if (req.user.role == UserRole.CLIENT) {
            const claim = await this.claimPersistenceService.findOneById(
                query.claimId,
            );

            if (!claim) {
                throw new NotFoundException(CLAIM_NOT_FOUND);
            }

            if (claim.userId != req.user.id) {
                throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
            }
        }

        const passenger = await this.otherPassengerService.getOtherPassenger(
            query.passengerId,
        );

        const customer = await this.customerService.getCustomer(
            query.passengerId,
        );

        let jwt: string;
        if (passenger) {
            jwt = await this.generateLinksService.continueJwtLink(
                query.claimId,
                {
                    id: passenger.id,
                    copiedLinkType: OtherPassengerCopiedLinkType.PASSPORT,
                },
            );

            await this.otherPassengerCopiedLinksService.createIfNotExist(
                passenger.id,
                false,
                OtherPassengerCopiedLinkType.PASSPORT,
            );
        } else if (customer) {
            jwt = await this.generateLinksService.continueJwtLink(
                query.claimId,
            );
        } else {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        let passengerName = passenger
            ? `${passenger.firstName} ${passenger.lastName}`
            : `${customer!.firstName} ${customer!.lastName}`;

        const link = await this.generateLinksService.uploadDocuments(
            query.passengerId,
            query.claimId,
            jwt,
            JSON.stringify({
                documentTypes: [DocumentType.PASSPORT],
            }),
            passengerName,
        );
        return { link };
    }

    @Get('sign-customer')
    async copySignCustomer(@Query() query: SignCustomerDto) {
        const jwt = await this.generateLinksService.continueJwtLink(
            query.claimId,
        );
        const link = await this.generateLinksService.signCustomer(
            query.customerId,
            query.claimId,
            jwt,
        );
        return { link };
    }

    @Get('sign-other-passenger')
    async copySignOtherPassenger(@Query() query: UploadDocumentsDto) {
        const passenger = await this.otherPassengerService.getOtherPassenger(
            query.passengerId,
        );

        if (!passenger) {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        const jwt = await this.generateLinksService.continueJwtLink(
            query.claimId,
            {
                id: passenger.id,
                copiedLinkType: OtherPassengerCopiedLinkType.ASSIGNMENT,
            },
        );

        await this.otherPassengerCopiedLinksService.createIfNotExist(
            passenger.id,
            false,
            OtherPassengerCopiedLinkType.ASSIGNMENT,
        );

        const requireParentInfo =
            passenger.isMinor &&
            (!passenger.parentFirstName || !passenger.parentLastName);

        const link = await this.generateLinksService.signOtherPassenger(
            passenger.id,
            jwt,
            requireParentInfo,
            passenger.isMinor,
        );
        return { link };
    }
}

@Controller('links')
export class PublicGenerateLinksController {
    constructor(
        private readonly generateLinksService: GenerateLinksService,
        private readonly tokenService: TokenService,
        private readonly otherPassengerService: OtherPassengerService,
        private readonly otherPassengerCopiedLinksService: OtherPassengerCopiedLinksService,
    ) {}

    @Get('public/sign-other-passenger')
    async copySignOtherPassenger(@Query() query: PublicSignOtherPassengerDto) {
        const token = await this.tokenService.verifyJWT<{ claimId?: string }>(
            query.claimJwt,
        );

        if (!token?.claimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        const passenger = await this.otherPassengerService.getOtherPassenger(
            query.passengerId,
        );

        if (!passenger) {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        const jwt = await this.generateLinksService.continueJwtLink(
            token.claimId,
            {
                id: passenger.id,
                copiedLinkType: OtherPassengerCopiedLinkType.ASSIGNMENT,
            },
        );

        await this.otherPassengerCopiedLinksService.createIfNotExist(
            passenger.id,
            true,
            OtherPassengerCopiedLinkType.ASSIGNMENT,
        );

        const requireParentInfo =
            passenger.isMinor &&
            (!passenger.parentFirstName || !passenger.parentLastName);

        const link = await this.generateLinksService.signOtherPassenger(
            passenger.id,
            jwt,
            requireParentInfo,
            passenger.isMinor,
        );

        return { link };
    }

    @Get('public/upload-documents')
    async copyUploadDocuments(@Query() query: PublicUploadDocumentsDto) {
        const { passengerId, documentTypes, claimJwt } = query;
        const otherPassengerCopiedLinkType = documentTypes.includes(
            DocumentType.PASSPORT,
        )
            ? OtherPassengerCopiedLinkType.PASSPORT
            : OtherPassengerCopiedLinkType.DOCUMENT;
        const token = await this.tokenService.verifyJWT<{ claimId?: string }>(
            claimJwt,
        );

        if (!token?.claimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        const passenger =
            await this.otherPassengerService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new BadRequestException(PASSENGER_NOT_FOUND);
        }

        const jwt = await this.generateLinksService.continueJwtLink(
            token.claimId,
            {
                id: passenger.id,
                copiedLinkType: otherPassengerCopiedLinkType,
            },
        );
        await this.otherPassengerCopiedLinksService.createIfNotExist(
            passenger.id,
            true,
            otherPassengerCopiedLinkType,
        );

        const link = await this.generateLinksService.uploadDocuments(
            passengerId,
            token.claimId,
            jwt,
            documentTypes,
            `${passenger.firstName} ${passenger.lastName}`,
        );
        return { link };
    }

    @Post('/boarding-pass/scan')
    generateQRUuidLink() {
        const sessionId = uuid();

        const link = this.generateLinksService.scanLink(sessionId);

        return {
            sessionId,
            link,
        };
    }
}
