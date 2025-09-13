import {
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { IsPartnerOrAgentGuard } from '../../guards/isPartnerOrAgentGuard';
import { TokenService } from '../token/token.service';
import { GenerateLinksService } from './generate-links.service';
import {
    CustomerClaimDto,
    OtherPassengerClaimDto,
    PublicSignOtherPassengerDto,
    PublicUploadPassportDto,
} from './dto/generate-links.dto';
import {
    CONTINUE_LINKS_EXP,
    HAVE_NO_RIGHTS_ON_CLAIM,
    INVALID_CLAIM_ID,
    INVALID_JWT,
} from '../claim/constants';
import { VerifyJwtDto } from './dto/verify-jwt.dto';
import { ClaimService } from '../claim/claim.service';
import { AuthRequest } from '../../interfaces/AuthRequest.interface';
import { UserRole } from '@prisma/client';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class GenerateLinksController {
    constructor(
        private readonly tokenService: TokenService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(IsPartnerOrAgentGuard)
    @Get('upload-documents')
    async copyUploadDocuments(
        @Query() query: CustomerClaimDto,
        @Req() req: AuthRequest,
    ) {
        if (req.user.role == UserRole.CLIENT) {
            const claim = await this.claimService.getClaim(query.claimId);

            if (!claim) {
                throw new NotFoundException(INVALID_CLAIM_ID);
            }

            if (claim.userId != req.user.id) {
                throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
            }
        }

        const jwt = await this.generateLinkJwt(query.claimId);
        const link = await this.generateLinksService.generateUploadDocuments(
            query.customerId,
            query.claimId,
            jwt,
        );
        return { link };
    }

    @UseGuards(IsPartnerOrAgentGuard)
    @Get('upload-passport')
    async copyUploadPassport(
        @Query() query: CustomerClaimDto,
        @Req() req: AuthRequest,
    ) {
        if (req.user.role == UserRole.CLIENT) {
            const claim = await this.claimService.getClaim(query.claimId);

            if (!claim) {
                throw new NotFoundException(INVALID_CLAIM_ID);
            }

            if (claim.userId != req.user.id) {
                throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
            }
        }

        const jwt = await this.generateLinkJwt(query.claimId);
        const link = await this.generateLinksService.generateUploadPassport(
            query.customerId,
            query.claimId,
            jwt,
        );
        return { link };
    }

    @Get('sign-customer')
    async copySignCustomer(@Query() query: CustomerClaimDto) {
        const jwt = await this.generateLinkJwt(query.claimId);
        const link = await this.generateLinksService.generateSignCustomer(
            query.customerId,
            query.claimId,
            jwt,
        );
        return { link };
    }

    @Get('sign-other-passenger')
    async copySignOtherPassenger(@Query() query: OtherPassengerClaimDto) {
        const jwt = await this.generateLinkJwt(query.claimId);
        const link = await this.generateLinksService.generateSignOtherPassenger(
            query.passengerId,
            jwt,
        );
        return { link };
    }

    private async generateLinkJwt(claimId: string) {
        return this.tokenService.generateJWT(
            { claimId },
            { expiresIn: CONTINUE_LINKS_EXP },
        );
    }
}

@Controller('links')
export class PublicGenerateLinksController {
    constructor(
        private readonly generateLinksService: GenerateLinksService,
        private readonly tokenService: TokenService,
    ) {}

    @Get('verify')
    async verify(@Query() query: VerifyJwtDto) {
        const { jwt } = query;

        let isValid: boolean;
        try {
            await this.tokenService.verifyJWT(jwt);
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

        const jwt = await this.generateLinkJwt(token.claimId);
        const link = await this.generateLinksService.generateSignOtherPassenger(
            query.passengerId,
            jwt,
        );
        return { link };
    }

    @Get('public/upload-passport')
    async copyUploadPassport(@Query() query: PublicUploadPassportDto) {
        const token = await this.tokenService.verifyJWT<{ claimId?: string }>(
            query.claimJwt,
        );

        if (!token?.claimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        const jwt = await this.generateLinkJwt(token.claimId);
        const link = await this.generateLinksService.generateUploadPassport(
            query.customerId,
            token.claimId,
            jwt,
        );
        return { link };
    }

    private async generateLinkJwt(claimId: string) {
        return this.tokenService.generateJWT(
            { claimId },
            { expiresIn: CONTINUE_LINKS_EXP },
        );
    }
}
