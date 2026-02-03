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
import {
    ADD_FLIGHT_STATUS_QUEUE_KEY,
    BOOKING_REF_STEP,
    CLAIM_NOT_FOUND,
    CLAIM_REMINDER_INTERVAL,
    CLAIM_REMINDER_QUEUE_KEY,
    FINAL_STEP,
    INVALID_ICAO,
} from './constants';
import { AuthRequest } from '../../common/interfaces/AuthRequest.interface';
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
import { AirportService } from '../airport/airport.service';
import { NotificationService } from '../notification/services/notification.service';
import { UpdateFormStateDto } from './dto/update-form-state.dto';
import { DocumentService } from './document/services/document.service';
import { CustomerService } from './customer/customer.service';
import { validateClaimJwt } from '../../common/utils/validate-claim-jwt';
import { UploadFormSignDto } from './dto/upload-form-sign-dto';
import { AuthService } from '../auth/auth.service';
import { LanguageWithReferrerDto } from './dto/language-with-referrer.dto';
import { Languages } from '../language/enums/languages.enums';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IAddFlightStatusJobData } from './interfaces/job-data/add-flight-status-job-data.interface';
import { JwtOrApiKeyAuth } from '../../common/guards/jwtOrApiKeyAuth';
import { GetClaimsQuery } from './dto/get-claims.query';
import { normalizePhone } from '../../common/utils/normalizePhone';
import { PartnerService } from '../referral/partner/partner.service';
import { ApiKeyAuthGuard } from '../../common/guards/apiKeyAuthGuard';
import { UserService } from '../user/user.service';
import { getNextWorkTime } from '../../common/utils/getNextWorkTime';
import { ClaimCreatedLetter } from '../notification/letters/definitions/claim/claim-created.letter';
import { ClaimPersistenceService } from '../claim-persistence/services/claim-persistence.service';
import { IFullClaim } from '../claim-persistence/types/claim-persistence.types';
import { ClaimSearchService } from '../claim-persistence/services/claim-search.service';
import { GenerateLinksService } from '../generate-links/generate-links.service';

@Controller('claims')
@UseGuards(JwtOrApiKeyAuth)
export class ClaimController {
    constructor(private readonly claimSearchService: ClaimSearchService) {}

    @Get()
    async getClaims(@Req() req: AuthRequest, @Query() query: GetClaimsQuery) {
        const { phone, email } = query;

        return this.claimSearchService.getUserClaims(req?.user?.id, 1, {
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
        private readonly documentService: DocumentService,
        private readonly customerService: CustomerService,
        private readonly authService: AuthService,
        @InjectQueue(ADD_FLIGHT_STATUS_QUEUE_KEY)
        private readonly addFlightStatusQueue: Queue,
        private readonly partnerService: PartnerService,
        private readonly userService: UserService,
        @InjectQueue(CLAIM_REMINDER_QUEUE_KEY)
        private readonly claimReminderQueue: Queue,
        private readonly claimPersistenceService: ClaimPersistenceService,
        private readonly generateLinksService: GenerateLinksService,
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
        let referredById: string | null = null;
        const troubledRoute =
            dto.details.routes.find((r) => r.troubled) || dto.details.routes[0];

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

        if (referrer) {
            const partner =
                await this.partnerService.getPartnerByReferralCode(referrer);

            referredById = partner ? partner.id : null;
        }

        const { claim, jwt } = await this.claimService.createClaim(dto, {
            referredById,
            referrerSource,
            referrer,
            language,
            userId,
            flightNumber: dto.details.flightNumber,
            fullRoutes,
        });

        if (!claim.userId) {
            const user = await this.userService.getUserByEmail(
                claim.customer.email,
            );

            if (user) {
                await this.claimPersistenceService.update(
                    { userId: user.id },
                    claim.id,
                );
            }
        }

        await this.claimService.scheduleClaimFollowUpEmails({
            email: claim.customer.email,
            claimId: claim.id,
            language,
            continueClaimLink: claim.continueLink!,
            clientFirstName: claim.customer.firstName,
            compensation: claim.state.amount,
        });

        const addFlightStatusJobData: IAddFlightStatusJobData = {
            flightNumber: claim.details.flightNumber,
            airlineIcao: claim.details.airlines.icao,
            flightDate: claim.details.date,
            claimId: claim.id,
            airportIcao: troubledRoute.departureAirport.icao,
        };

        await this.claimReminderQueue.add(
            'claimReminder',
            { claimId: claim.id },
            {
                delay: getNextWorkTime(CLAIM_REMINDER_INTERVAL),
                attempts: 1,
            },
        );

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
            jwt,
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

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
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

        const claim = await this.claimPersistenceService.findOneById(claimId);

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
        );

        await this.claimPersistenceService.update({ step: 7 }, claimId);

        await this.customerService.setIsSignedCustomer(claim.customerId, true);

        return {
            ...claim,
            customer: {
                ...claim.customer,
                isSigned: true,
                signedAt: new Date(),
            },
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

        await this.claimPersistenceService.update(
            { formState: dto.formState },
            claimId,
        );
    }

    @Get(':claimId')
    @UseGuards(ApiKeyAuthGuard)
    async getClaim(@Param('claimId') claimId: string) {
        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
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

        const claim = (await this.claimPersistenceService.update(
            { step },
            claimId,
        ))!;

        if (step == BOOKING_REF_STEP) {
            await this.claimService.scheduleEnsureDocumentRequests({
                claimId: claim.id,
            });
        }
        if (step == FINAL_STEP) {
            await this.notificationService.sendLetter(
                new ClaimCreatedLetter({
                    to: claim.customer.email,
                    language: language,
                    claimId: claim.id,
                    airlineName: claim.details.airlines.name,
                    dashboardLink:
                        await this.generateLinksService.authorizedLoginLink(
                            claim.userId,
                        ),
                }),
            );
        }

        return await this.claimPersistenceService.updateFullObject(
            dto,
            claimId,
        );
    }

    @Post('/compensation')
    async getCompensation(@Body() dto: GetCompensationDto) {
        const { depIcao, arrIcao } = dto;

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
            Object.assign({ ...dto }, { flightDistanceKm: distance }),
        );

        return {
            compensation,
        };
    }
}
