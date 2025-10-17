import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { CreateClaimDto } from './dto/create-claim.dto';
import { ClaimService } from './claim.service';
import {
    ADD_FLIGHT_STATUS_QUEUE_KEY,
    FINAL_STEP,
    INVALID_CLAIM_ID,
    INVALID_ICAO,
} from './constants';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { AuthRequest } from '../../interfaces/AuthRequest.interface';
import { GetCompensationDto } from './dto/get-compensation.dto';
import { FlightService } from '../flight/flight.service';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { getAuthJwtFromRequest } from '../auth/typeGuards/getAuthJwt.function';
import { Request } from 'express';
import { TokenService } from '../token/token.service';
import { IClaimWithJwt } from './interfaces/claimWithJwt.interface';
import { JwtStepQueryDto } from './dto/jwt-step-query.dto';
import { JwtQueryDto } from './dto/jwt-query.dto';
import { IJwtPayload } from '../token/interfaces/jwtPayload';
import { GetCompensationQueryDto } from './dto/get-compensation-query.dto';
import { AirportService } from '../airport/airport.service';
import { NotificationService } from '../notification/notification.service';
import { ConfigService } from '@nestjs/config';
import { UpdateFormStateDto } from './dto/update-form-state.dto';
import { DocumentService } from './document/document.service';
import { CustomerService } from './customer/customer.service';
import { validateClaimJwt } from '../../utils/validate-claim-jwt';
import { IFullClaim } from './interfaces/full-claim.interface';
import { DocumentType } from '@prisma/client';
import { UploadFormSignDto } from './dto/upload-form-sign-dto';
import { AuthService } from '../auth/auth.service';
import { generateAssignmentName } from '../../utils/generate-assignment-name';
import { LanguageWithReferrerDto } from './dto/language-with-referrer.dto';
import { isProd } from '../../utils/isProd';
import { Languages } from '../language/enums/languages.enums';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IAddFlightStatusJobData } from './interfaces/add-flight-status-job-data.interface';
import { ApiKeyAuthGuard } from '../../guards/ApiKeyAuthGuard';
import { JwtOrApiKeyAuth } from '../../guards/jwtOrApiKeyAuth';
import { GetClaimsQuery } from './dto/get-claims.query';
import { normalizePhone } from '../../utils/normalizePhone';

@Controller('claims')
@UseGuards(JwtOrApiKeyAuth)
export class ClaimController {
    constructor(private readonly claimService: ClaimService) {}

    @Get()
    async getClaims(@Req() req: AuthRequest, @Query() query: GetClaimsQuery) {
        const { phone, email } = query;

        return this.claimService.getUserClaims(req?.user?.id, 1, {
            phone: phone ? normalizePhone(phone) : undefined,
            email,
        });
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
        private readonly authService: AuthService,
        @InjectQueue(ADD_FLIGHT_STATUS_QUEUE_KEY)
        private readonly addFlightStatusQueue: Queue,
    ) {}

    @Post()
    async create(
        @Body() dto: CreateClaimDto,
        @Req() req: Request,
        @Query() query: LanguageWithReferrerDto,
    ): Promise<IClaimWithJwt> {
        const { language, referrer, referrerSource } = query;
        let userId: string | null = null;
        let userToken: string | null = null;

        const fullRoutes = await Promise.all(
            dto.details.routes.map(async (r) => {
                const arrivalAirport =
                    await this.airportService.getAirportByIcao(
                        r.arrivalAirport.icao,
                    );
                const departureAirport =
                    await this.airportService.getAirportByIcao(
                        r.departureAirport.icao,
                    );

                if (!arrivalAirport || !departureAirport) {
                    throw new BadRequestException('Invalid airport');
                }

                return {
                    troubled: r.troubled,
                    departureAirport: {
                        icao: departureAirport.icao_code,
                        iata: departureAirport.iata_code,
                        name: departureAirport.name,
                        country: departureAirport?.country,
                    },
                    arrivalAirport: {
                        icao: arrivalAirport.icao_code,
                        iata: arrivalAirport.iata_code,
                        name: arrivalAirport.name,
                        country: arrivalAirport.country,
                    },
                };
            }),
        );

        // if user account doesn't exist generate new one
        const jwtPayload = getAuthJwtFromRequest(req);
        if (jwtPayload) {
            userId = (
                await this.tokenService.verifyJWT<IJwtPayload>(jwtPayload)
            ).id;
        }

        if (!userId) {
            const userData = await this.authService.generateNewUser({
                email: dto.customer.email,
                name: dto.customer.firstName,
                secondName: dto.customer.lastName,
                language: language || Languages.EN,
            });
            userToken = userData.userToken;
            userId = userData.userId;
        }

        const claim = await this.claimService.createClaim(dto, {
            referrer,
            referrerSource,
            language,
            userId,
            flightNumber: dto.details.flightNumber,
            fullRoutes,
        });

        // Temporary mock
        if (referrer == 'zbor') {
            await this.claimService.addPartner(
                claim.id,
                isProd()
                    ? '7d7bdd2c-34e6-40b8-ad3d-8e05a6aa012d' // zbor
                    : '1fead5e5-4840-4f4a-b8f4-3ee82e3d81d8',
            );
        }

        this.claimService.scheduleClaimFollowUpEmails({
            email: claim.customer.email,
            claimId: claim.id,
            language,
            continueClaimLink: claim.continueLink!, // after creating continue link isn't null anyway
            clientFirstName: claim.customer.firstName,
            compensation: claim.state.amount,
        });

        const addFlightStatusJobData: IAddFlightStatusJobData = {
            flightNumber: claim.details.flightNumber,
            airlineIcao: claim.details.airlines.icao,
            flightDate: claim.details.date,
            claimId: claim.id,
        };

        await this.addFlightStatusQueue.add(
            'addFlightStatus',
            addFlightStatusJobData,
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
            },
        );

        return {
            claimData: claim,
            jwt: claim.jwt,
            userToken: userToken ? userToken : null,
        };
    }

    @Get('/:claimId/formState')
    async getFormState(
        @Param('claimId') claimId: string,
        @Query() query: JwtQueryDto,
    ) {
        const { jwt } = query;

        await validateClaimJwt(
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
        @Body() dto: UploadFormSignDto,
    ): Promise<IFullClaim> {
        const { jwt } = query;
        const { signature, claimId } = dto;

        await validateClaimJwt(
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
                    name: generateAssignmentName(
                        claim.customer.firstName,
                        claim.customer.lastName,
                    ),
                    passengerId: claim.customer.id,
                    documentType: DocumentType.ASSIGNMENT,
                },
            ],
            claimId,
            true,
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

        await validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        await this.claimService.updateFormState(claimId, dto.formState);
    }

    @Get(':claimId')
    @UseGuards(ApiKeyAuthGuard)
    async getClaim(@Param('claimId') claimId: string, @Req() req: Request) {
        const claim = await this.claimService.getClaim(claimId);

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

        await validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const claim = await this.claimService.updateStep(claimId, step);

        if (step == FINAL_STEP) {
            await this.notificationService.sendClaimCreated(
                claim.customer.email,
                {
                    id: claim.id,
                    link: `${this.configService.getOrThrow('FRONTEND_URL')}/dashboard}`,
                    airlineName: claim.details.airlines.name,
                },
                true, // deprecated param
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
