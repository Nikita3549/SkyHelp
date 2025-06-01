import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    Req,
    UnauthorizedException,
    UploadedFiles,
    UseGuards,
} from '@nestjs/common';
import { CreateClaimDto } from './dto/create-claim.dto';
import { DocumentsUploadInterceptor } from '../../interceptors/documents/documents-upload.interceptor';
import { ClaimsService } from './claims.service';
import {
    CLAIM_NOT_FOUND,
    INVALID_CLAIM_ID,
    INVALID_FLIGHT_ID,
    SAVE_DOCUMENTS_SUCCESS,
} from './constants';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { AuthRequest } from '../../interfaces/AuthRequest.interface';
import { Claim } from '@prisma/client';
import { GetCompensationDto } from './dto/get-compensation.dto';
import { FlightsService } from '../flights/flights.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { IsModeratorGuard } from '../../guards/isModerator.guard';
import { UpdateClaimDto } from './dto/update-claim.dto';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
    constructor(
        private readonly claimsService: ClaimsService,
        private readonly flightService: FlightsService,
    ) {}
    @Post('/:claimId/documents')
    @DocumentsUploadInterceptor()
    async uploadDocuments(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimsService.getClaim(claimId))) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.claimsService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                };
            }),
            claimId,
        );

        return SAVE_DOCUMENTS_SUCCESS;
    }

    @Post()
    async create(
        @Body() dto: CreateClaimDto,
        @Req() req: AuthRequest,
    ): Promise<Claim> {
        return await this.claimsService.createClaim(dto, req.user.id);
    }

    @Post('/:flightId/compensation')
    async getCompensation(
        @Body() dto: GetCompensationDto,
        @Param('flightId') flightId: string,
    ) {
        const flight = await this.flightService
            .getFlightById(flightId)
            .catch((_e) => {
                throw new BadRequestException(INVALID_FLIGHT_ID);
            });

        const compensation = this.claimsService.calculateCompensation(
            Object.assign(dto, { flightDistanceKm: flight.actual_distance }),
        );

        return {
            compensation,
        };
    }

    @UseGuards(IsModeratorGuard)
    @Put('/progress/:progressId/')
    async updateProgress(
        @Body() dto: UpdateProgressDto,
        @Param('progressId') progressId: string,
    ) {
        return this.claimsService.updateProgress(
            {
                title: dto.title,
                description: dto.description,
                endAt: dto.endAt ? new Date(dto.endAt) : null,
                status: dto.status,
            },
            progressId,
        );
    }

    @UseGuards(IsModeratorGuard)
    @Put('/:claimId')
    async updateClaim(
        @Body() dto: UpdateClaimDto,
        @Param('claimId') claimId: string,
    ) {
        if (await this.claimsService.getClaim(claimId)) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return await this.claimsService.updateClaim(dto, claimId);
    }

    @Get('/:claimId')
    async getClaim(@Param('claimId') claimId: string, @Req() req: AuthRequest) {
        const claim = await this.claimsService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }
        if (claim.userId != req.user.id) {
            throw new UnauthorizedException();
        }

        return claim;
    }

    @Get()
    async getClaims(@Req() req: AuthRequest) {
        return this.claimsService.getUserClaims(req.user.id);
    }

    @Get('/admin/:claimId')
    async getAdminClaim(@Param('claimId') claimId: string) {
        const claim = await this.claimsService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return claim;
    }

    @Get('admin')
    async getAdminClaims(@Query('userId') userId?: string) {
        return this.claimsService.getUserClaims(userId);
    }
}
