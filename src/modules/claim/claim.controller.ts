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
    CONTINUE_LINKS_EXP,
    FINAL_STEP,
    HOUR,
    INVALID_CLAIM_ID,
    INVALID_ICAO,
    MINUTE,
} from './constants';
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
import { UpdateFormStateDto } from './dto/update-form-state.dto';
import { DocumentService } from './document/document.service';
import { CustomerService } from './customer/customer.service';
import { validateClaimJwt } from '../../utils/validate-claim-jwt';
import { IFullClaim } from './interfaces/full-claim.interface';
import {
    CancellationNotice,
    DelayCategory,
    DisruptionType,
    DocumentType,
    UserRole,
} from '@prisma/client';
import { UploadFormSignDto } from './dto/upload-form-sign-dto';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';
import { generateAssignmentName } from '../../utils/generate-assignment-name';
import { AirlineService } from '../airline/airline.service';
import { LanguageWithReferrerDto } from './dto/language-with-referrer.dto';
import { isProd } from '../../utils/isProd';

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
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly airlineService: AirlineService,
    ) {}

    @Post()
    async create(
        @Body() dto: CreateClaimDto,
        @Req() req: Request,
        @Query() query: LanguageWithReferrerDto,
    ): Promise<IClaimWithJwt> {
        const { language, referrer, referrerSource } = query;
        let userId: string | null | undefined;
        let userToken: string | undefined | null;
        const troubledRoute = dto.details.routes.find((r) => r.troubled);
        if (!troubledRoute) {
            throw new BadRequestException(
                'There is no troubled route in request',
            );
        }
        const departureAirport = await this.airportService.getAirportByIcao(
            troubledRoute.departureAirport.icao,
        );
        const arrivalAirport = await this.airportService.getAirportByIcao(
            troubledRoute.arrivalAirport.icao,
        );
        if (!departureAirport || !arrivalAirport) {
            throw new BadRequestException(
                'Invalid departure or arrival airport ICAO',
            );
        }

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

        const jwtPayload = getAuthJwt(req);
        if (jwtPayload) {
            userId = (
                await this.tokenService.verifyJWT<IJwtPayload>(jwtPayload)
            ).id;
        }

        // if user account doesn't exist generate new one
        if (!userId) {
            const user = await this.userService.getUserByEmail(
                dto.customer.email,
            );

            if (!user) {
                const password = this.authService.generatePassword();

                const hashedPassword =
                    await this.authService.hashPassword(password);

                const newUser = await this.userService.saveUser({
                    email: dto.customer.email,
                    hashedPassword,
                    name: dto.customer.firstName,
                    secondName: dto.customer.lastName,
                });
                userId = newUser.id;

                userToken = this.tokenService.generateJWT({
                    id: newUser.id,
                    email: newUser.email,
                    name: newUser.name,
                    secondName: newUser.secondName,
                    role: UserRole.CLIENT,
                    isActive: true,
                });

                this.notificationService.sendNewGeneratedAccount(
                    dto.customer.email,
                    {
                        email: dto.customer.email,
                        password,
                    },
                    language,
                );
            }
        }

        const duplicate = await this.claimService.findDuplicate({
            email: dto.customer.email,
            firstName: dto.customer.firstName,
            lastName: dto.customer.lastName,
            flightNumber: dto.details.flightNumber,
        });

        // Calculate flight status
        const flightStatus = await this.flightService.getFlightByFlightCode(
            dto.details.flightNumber.replace(
                dto.details.airline.iata || '',
                '',
            ),
            dto.details.airline.icao,
            dto.details.date,
        );

        let actualCompensation: number | undefined;

        if (flightStatus) {
            const actualDistance =
                this.flightService.calculateDistanceBetweenAirports(
                    departureAirport.latitude,
                    departureAirport.longitude,
                    departureAirport.altitude,
                    arrivalAirport.latitude,
                    arrivalAirport.longitude,
                    arrivalAirport.altitude,
                );
            actualCompensation = this.claimService.calculateCompensation({
                flightDistanceKm: actualDistance,
                delayHours: flightStatus.cancelled
                    ? null
                    : (flightStatus?.arrival_delay
                            ? Math.floor(flightStatus.arrival_delay / HOUR)
                            : 0) > 3
                      ? DelayCategory.threehours_or_more
                      : DelayCategory.less_than_3hours,
                cancellationNoticeDays: flightStatus.cancelled
                    ? CancellationNotice.less_than_14days
                    : null,
                wasDeniedBoarding:
                    dto.issue.disruptionType == DisruptionType.denied_boarding,
                wasAlternativeFlightOffered:
                    !!dto.issue.wasAlternativeFlightOffered,
                arrivalTimeDelayOfAlternative:
                    dto.issue.arrivalTimeDelayOfAlternativeHours || 0,
                wasDisruptionDuoExtraordinaryCircumstances: false, // deprecated param, extraordinary circumstances always aren't proved
            });
        }

        // Create claim
        const claim = await this.claimService.createClaim(dto, {
            referrer,
            referrerSource,
            language,
            userId,
            isDuplicate: !!duplicate,
            flightNumber: dto.details.flightNumber,
            fullRoutes,
            flightStatusData: flightStatus
                ? {
                      isCancelled: flightStatus?.cancelled,
                      delayMinutes: flightStatus?.arrival_delay
                          ? flightStatus.arrival_delay / MINUTE
                          : 0,
                      actualCompensation: actualCompensation || 0,
                  }
                : undefined,
        });

        if (referrer == 'zbor') {
            await this.claimService.addPartner(
                claim.id,
                isProd()
                    ? '7d7bdd2c-34e6-40b8-ad3d-8e05a6aa012d' // zbor
                    : '1fead5e5-4840-4f4a-b8f4-3ee82e3d81d8',
            );
        }

        const jwt = this.tokenService.generateJWT<IClaimJwt>(
            {
                claimId: claim.id,
            },
            { expiresIn: CONTINUE_LINKS_EXP },
        );

        const continueClaimLink = `${this.configService.getOrThrow('FRONTEND_URL')}/claim?claimId=${claim.id}&jwt=${jwt}`;

        this.claimService.scheduleClaimFollowUpEmails({
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
                },
            ],
            claimId,
            DocumentType.ASSIGNMENT,
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
    async getClaim(@Param('claimId') claimId: string) {
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
