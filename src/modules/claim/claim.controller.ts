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
import { NotificationService } from '../notification/notification.service';
import { ConfigService } from '@nestjs/config';
import { UpdateFormStateDto } from './dto/update-form-state.dto';
import { DocumentService } from './document/services/document.service';
import { CustomerService } from './customer/customer.service';
import { validateClaimJwt } from '../../common/utils/validate-claim-jwt';
import { IFullClaim } from './interfaces/full-claim.interface';
import { DocumentType } from '@prisma/client';
import { UploadFormSignDto } from './dto/upload-form-sign-dto';
import { AuthService } from '../auth/auth.service';
import { generateAssignmentName } from '../../common/utils/generate-assignment-name';
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
        private readonly partnerService: PartnerService,
        private readonly userService: UserService,
        @InjectQueue(CLAIM_REMINDER_QUEUE_KEY)
        private readonly claimReminderQueue: Queue,
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

        const claim = await this.claimService.createClaim(dto, {
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
                await this.claimService.updateUserId(user.id, claim.id);
            }
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

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const assignmentFileName = generateAssignmentName(
            claim.customer.firstName,
            claim.customer.lastName,
        );

        const file = await this.documentService.saveSignaturePdf(
            {
                imageDataUrl: signature,
            },
            {
                firstName: claim.customer.firstName,
                lastName: claim.customer.lastName,
                flightNumber: claim.details.flightNumber,
                date: claim.details.date,
                address: claim.customer.address,
                claimId: claim.id,
                airlineName: claim.details.airlines.name,
                fileName: assignmentFileName,
            },
        );

        const documents = await this.documentService.saveDocuments(
            [
                {
                    buffer: file.buffer,
                    name: assignmentFileName,
                    passengerId: claim.customer.id,
                    documentType: DocumentType.ASSIGNMENT,
                    mimetype: 'application/pdf',
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
            Object.assign(dto, { flightDistanceKm: distance }),
        );

        return {
            compensation,
        };
    }
}
