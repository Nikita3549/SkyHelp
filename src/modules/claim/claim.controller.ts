import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ClaimService } from './claim.service';
import { INVALID_CLAIM_ID, INVALID_ICAO } from './constants';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { AuthRequest } from '../../interfaces/AuthRequest.interface';
import { GetCompensationDto } from './dto/get-compensation.dto';
import { FlightService } from '../flight/flight.service';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { getAuthJwt } from '../auth/typeGuards/getAuthJwt.function';
import { Request } from 'express';
import { TokenService } from '../token/token.service';
import { IClaimWithJwt } from './interfaces/claimWithJwt.interface';
import { IClaimJwt } from './interfaces/claim-jwt.interface';
import { JwtStepQueryDto } from './dto/jwt-step-query.dto';
import { JwtQueryDto } from './dto/jwt-query.dto';
import { IJwtPayload } from '../token/interfaces/jwtPayload';
import { GetCompensationQueryDto } from './dto/get-compensation-query.dto';
import { AirportService } from '../airport/airport.service';
import { NotificationService } from '../notification/notification.service';
import { ConfigService } from '@nestjs/config';
import { UploadSignDto } from './customer/dto/upload-sign.dto';
import { UpdateFormStateDto } from './dto/update-form-state.dto';
import { LanguageQueryDto } from './dto/language-query.dto';
import { DocumentService } from './document/document.service';
import { CustomerService } from './customer/customer.service';
import { validateClaimJwt } from './utils/validate-claim-jwt';
import { IFullClaim } from './interfaces/full-claim.interface';
import { DocumentType } from '@prisma/client';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimController {
    constructor(private readonly claimService: ClaimService) {}

    @Get()
    async getClaims(@Req() req: AuthRequest) {
        return this.claimService.getUserClaims(req.user.id);
    }
}

@Controller('claims')
export class PublicClaimController {
    constructor(
        private readonly claimService: ClaimService,
        private readonly tokenService: TokenService,
        private readonly flightService: FlightService,
        private readonly airportService: AirportService,
        private readonly notificationService: NotificationService,
        private readonly configService: ConfigService,
        private readonly documentService: DocumentService,
        private readonly customerService: CustomerService,
    ) {}

    @Post()
    async create(
        @Body() dto: CreateClaimDto,
        @Req() req: Request,
        @Query() query: LanguageQueryDto,
    ): Promise<IClaimWithJwt> {
        const { language } = query;
        let user = getAuthJwt(req);

        if (user) {
            user = this.tokenService.verifyJWT<IJwtPayload>(user).id;
        }

        const claim = await this.claimService.createClaim(dto, user);

        const jwt = this.tokenService.generateJWT<IClaimJwt>(
            {
                claimId: claim.id,
            },
            { expiresIn: '30days' },
        );

        const continueClaimLink = `${this.configService.getOrThrow('FRONTEND_HOST')}/claim?claimId=${claim.id}&jwt=${jwt}`;

        await this.claimService.scheduleClaimFollowUpEmails({
            email: claim.customer.email,
            claimId: claim.id,
            language,
            continueClaimLink,
            clientFirstName: claim.customer.firstName,
            compensation: claim.state.amount as number,
        });

        await this.claimService.updateContinueLink(claim.id, continueClaimLink);

        return {
            claimData: claim,
            jwt,
        };
    }
    @Get('/:claimId/formState')
    async getFormState(
        @Param('claimId') claimId: string,
        @Query() query: JwtQueryDto,
    ) {
        const { jwt } = query;

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        return {
            formState: claim.formState,
        };
    }

    @Post('/sign')
    async uploadSign(
        @Query() query: JwtQueryDto,
        @Body() dto: UploadSignDto,
    ): Promise<IFullClaim> {
        const { jwt } = query;
        const { signature, claimId } = dto;

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        const path = await this.documentService.saveSignaturePdf(signature, {
            firstName: claim.customer.firstName,
            lastName: claim.customer.lastName,
            flightNumber: claim.details.flightNumber,
            date: claim.details.date,
            address: claim.customer.address,
            claimId: claim.id,
            airlineName: claim.details.airlines.name,
        });

        const documents = await this.documentService.saveDocuments(
            [
                {
                    path,
                    name: `${claim.customer.firstName}_${claim.customer.lastName}-assignment_agreement.pdf`,
                },
            ],
            claimId,
            DocumentType.ASSIGNMENT,
        );

        await this.claimService.updateStep(claimId, 7);

        await this.customerService.setIsSignedCustomer(claim.customerId, true);

        return {
            ...claim,
            customer: {
                ...claim.customer,
                isSigned: true,
            },
            documents: [...documents],
        };
    }

    @Put(':claimId/formState')
    async updateFormState(
        @Param('claimId') claimId: string,
        @Body() dto: UpdateFormStateDto,
        @Query() query: JwtQueryDto,
    ) {
        const { jwt } = query;

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        await this.claimService.updateFormState(claimId, dto.formState);
    }

    @Get(':claimId')
    async getClaim(@Param('claimId') claimId: string) {
        const claim = this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        return claim;
    }

    @Put(':claimId')
    async updateClaim(
        @Body() dto: UpdateClaimDto,
        @Param('claimId') claimId: string,
        @Query() query: JwtStepQueryDto,
    ) {
        const { jwt, step, language } = query;

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const claim = await this.claimService.updateStep(claimId, step);

        if (step == 9) {
            await this.notificationService.sendClaimCreated(
                claim.customer.email,
                {
                    id: claim.id,
                    link: `${this.configService.getOrThrow('FRONTEND_HOST')}/${claim.userId ? 'dashboard' : `register?claim=${jwt}&email=${claim.customer.email}`}`,
                    airlineName: claim.details.airlines.name,
                },
                !!claim.userId,
                language,
            );
        }

        return await this.claimService.updateClaim(dto, claimId);
    }

    @Post('/compensation')
    async getCompensation(
        @Body() dto: GetCompensationDto,
        @Query() query: GetCompensationQueryDto,
    ) {
        const { depIcao, arrIcao } = query;

        const arrivalAirport =
            await this.airportService.getAirportByIcao(arrIcao);
        const departureAirport =
            await this.airportService.getAirportByIcao(depIcao);

        if (!arrivalAirport || !departureAirport) {
            throw new BadRequestException(INVALID_ICAO);
        }

        const distance = this.flightService.calculateDistanceBetweenAirports(
            departureAirport.latitude,
            departureAirport.longitude,
            departureAirport.altitude,
            arrivalAirport.latitude,
            arrivalAirport.longitude,
            arrivalAirport.altitude,
        );

        const compensation = this.claimService.calculateCompensation(
            Object.assign(dto, { flightDistanceKm: distance }),
        );

        return {
            compensation,
        };
    }
}
