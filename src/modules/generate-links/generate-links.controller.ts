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
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { IsAgentOrLawyerGuardOrPartner } from '../../guards/isAgentOrLawyerGuardOrPartner';
import { TokenService } from '../token/token.service';
import { GenerateLinksService } from './generate-links.service';
import {
    OtherPassengerClaimDto,
    PublicSignOtherPassengerDto,
    PublicUploadPassportDto,
} from './dto/generate-links.dto';
import {
    CLAIM_NOT_FOUND,
    CONTINUE_LINKS_EXP,
    HAVE_NO_RIGHTS_ON_CLAIM,
    INVALID_JWT,
    PASSENGER_NOT_FOUND,
} from '../claim/constants';
import { VerifyJwtDto } from './dto/verify-jwt.dto';
import { ClaimService } from '../claim/claim.service';
import { AuthRequest } from '../../interfaces/AuthRequest.interface';
import { DocumentType, UserRole } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { OtherPassengerService } from '../claim/other-passenger/other-passenger.service';
import { OtherPassengerCopiedLinksService } from '../claim/other-passenger/other-passenger-copied-links/other-passenger-copied-links.service';
import { isOtherPassengerLinkJwt } from './utils/isOtherPassengerLinkJwt';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class GenerateLinksController {
    constructor(
        private readonly tokenService: TokenService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly claimService: ClaimService,
        private readonly otherPassengerService: OtherPassengerService,
        private readonly otherPassengerCopiedLinksService: OtherPassengerCopiedLinksService,
    ) {}

    @UseGuards(IsAgentOrLawyerGuardOrPartner)
    @Get('upload-documents')
    async copyUploadDocuments(
        @Query() query: OtherPassengerClaimDto,
        @Req() req: AuthRequest,
    ) {
        if (req.user.role == UserRole.CLIENT) {
            const claim = await this.claimService.getClaim(query.claimId);

            if (!claim) {
                throw new NotFoundException(CLAIM_NOT_FOUND);
            }

            if (claim.userId != req.user.id) {
                throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
            }
        }

        const jwt = await this.generateLinkJwt(query.claimId);
        const link = await this.generateLinksService.generateUploadDocuments(
            query.passengerId,
            query.claimId,
            jwt,
            query.documentType,
        );
        return { link };
    }

    @UseGuards(IsAgentOrLawyerGuardOrPartner)
    @Get('upload-passport')
    async copyUploadPassport(
        @Query() query: OtherPassengerClaimDto,
        @Req() req: AuthRequest,
    ) {
        if (req.user.role == UserRole.CLIENT) {
            const claim = await this.claimService.getClaim(query.claimId);

            if (!claim) {
                throw new NotFoundException(CLAIM_NOT_FOUND);
            }

            if (claim.userId != req.user.id) {
                throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
            }
        }

        const jwt = await this.generateLinkJwt(query.claimId);
        const link = await this.generateLinksService.generateUploadDocuments(
            query.passengerId,
            query.claimId,
            jwt,
            [DocumentType.PASSPORT],
        );
        return { link };
    }

    @Get('sign-customer')
    async copySignCustomer(@Query() query: OtherPassengerClaimDto) {
        const jwt = await this.generateLinkJwt(query.claimId);
        const link = await this.generateLinksService.generateSignCustomer(
            query.passengerId,
            query.claimId,
            jwt,
        );
        return { link };
    }

    @Get('sign-other-passenger')
    async copySignOtherPassenger(@Query() query: OtherPassengerClaimDto) {
        const passenger = await this.otherPassengerService.getOtherPassenger(
            query.passengerId,
        );

        if (!passenger) {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        const jwt = await this.generateLinkJwt(query.claimId, passenger.id);

        await this.otherPassengerCopiedLinksService.create(passenger.id, false);

        const requireParentInfo =
            passenger.isMinor &&
            (!passenger.parentFirstName || !passenger.parentLastName);

        const link = await this.generateLinksService.generateSignOtherPassenger(
            passenger.id,
            jwt,
            requireParentInfo,
        );
        return { link };
    }

    private async generateLinkJwt(claimId: string, otherPassengerId?: string) {
        return this.tokenService.generateJWT(
            { claimId, otherPassengerId },
            { expiresIn: CONTINUE_LINKS_EXP },
        );
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

    @Get('verify')
    async verify(@Query() query: VerifyJwtDto) {
        const { jwt } = query;

        let isValid: boolean;
        try {
            const jwtPayload = await this.tokenService.verifyJWT(jwt);

            if (isOtherPassengerLinkJwt(jwtPayload)) {
                await this.otherPassengerCopiedLinksService.markAsOpened(
                    jwtPayload.otherPassengerId,
                );
            }
            isValid = true;
        } catch (e) {
            isValid = false;
        }

        return { isValid };
    }

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

        const jwt = await this.generateLinkJwt(token.claimId, passenger.id);

        await this.otherPassengerCopiedLinksService.create(passenger.id, true);

        const requireParentInfo =
            passenger.isMinor &&
            (!passenger.parentFirstName || !passenger.parentLastName);

        const link = await this.generateLinksService.generateSignOtherPassenger(
            passenger.id,
            jwt,
            requireParentInfo,
        );

        return { link };
    }

    @Get('public/upload-documents')
    async copyUploadDocuments(@Query() query: PublicUploadPassportDto) {
        const { passengerId, documentType, claimJwt } = query;
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

        const jwt = await this.generateLinkJwt(token.claimId, passengerId);
        const link = await this.generateLinksService.generateUploadDocuments(
            passengerId,
            token.claimId,
            jwt,
            documentType,
        );
        return { link };
    }

    private async generateLinkJwt(claimId: string, otherPassengerId?: string) {
        return this.tokenService.generateJWT(
            { claimId, otherPassengerId },
            { expiresIn: CONTINUE_LINKS_EXP },
        );
    }

    @Post('/boarding-pass/scan')
    generateQRUuidLink() {
        const sessionId = uuid();

        const link = this.generateLinksService.generateScanLink(sessionId);

        return {
            sessionId,
            link,
        };
    }
}
