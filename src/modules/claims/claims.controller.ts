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
    Res,
    UnauthorizedException,
    UploadedFiles,
    UseGuards,
} from '@nestjs/common';
import { CreateClaimDto } from './dto/create-claim.dto';
import { DocumentsUploadInterceptor } from '../../interceptors/documents/documents-upload.interceptor';
import { ClaimsService } from './claims.service';
import {
    CLAIM_NOT_FOUND,
    FILE_DOESNT_ON_DISK,
    INVALID_CLAIM_ID,
    INVALID_CUSTOMER_ID,
    INVALID_DOCUMENT_ID,
    INVALID_FLIGHT_ID,
    INVALID_ICAO,
    INVALID_JWT,
    INVALID_PASSENGER_ID,
    SAVE_DOCUMENTS_SUCCESS,
} from './constants';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { AuthRequest } from '../../interfaces/AuthRequest.interface';
import { GetCompensationDto } from './dto/get-compensation.dto';
import { FlightsService } from '../flights/flights.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { IsModeratorGuard } from '../../guards/isModerator.guard';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { getAuthJwt } from '../auth/typeGuards/getAuthJwt.function';
import { Request } from 'express';
import { TokenService } from '../token/token.service';
import { IClaimWithJwt } from './interfaces/claimWithJwt.interface';
import { IClaimJwt } from './interfaces/claim-jwt.interface';
import { JwtStepQueryDto } from './dto/jwt-step-query.dto';
import { JwtQueryDto } from './dto/jwt-query.dto';
import { IJwtPayload } from '../token/interfaces/jwtPayload';
import { GetAdminClaimsQuery } from './dto/get-admin-claims.query';
import { GetDocumentAdminDto } from './dto/get-document-admin.dto';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';
import { lookup as mimeLookup } from 'mime-types';
import { CustomerDto } from './dto/update-parts/customer.dto';
import { FlightDto } from './dto/update-parts/flight.dto';
import { IssueDto } from './dto/update-parts/issue.dto';
import { PaymentDto } from './dto/update-parts/payment.dto';
import { StateDto } from './dto/update-parts/state.dto';
import { GetCompensationQueryDto } from './dto/get-compensation-query.dto';
import { AirportsService } from '../airports/airports.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { UploadSignDto } from './dto/upload-sign.dto';
import { CreateOtherPassengersDto } from './dto/create-other-passengers.dto';
import { UpdatePassengerDto } from './dto/update-passenger.dto';
import { UpdateFormStateDto } from './dto/update-form-state.dto';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
    constructor(private readonly claimsService: ClaimsService) {}
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
                order: dto.order,
            },
            progressId,
        );
    }

    // @Get('/:claimId')
    // async getClaim(@Param('claimId') claimId: string, @Req() req: AuthRequest) {
    //     const claim = await this.claimsService.getClaim(claimId);
    //
    //     if (!claim) {
    //         throw new BadRequestException(INVALID_CLAIM_ID);
    //     }
    //     if (claim.userId != req.user.id) {
    //         throw new UnauthorizedException();
    //     }
    //
    //     return claim;
    // }

    @Get()
    async getClaims(@Req() req: AuthRequest) {
        return this.claimsService.getUserClaims(req.user.id);
    }
    @Get('/admin/all')
    @UseGuards(IsModeratorGuard)
    async getAdminClaims(@Query() query: GetAdminClaimsQuery) {
        const { userId, page } = query;

        return this.claimsService.getUserClaims(userId, +page);
    }

    @Get('/admin/stats')
    @UseGuards(IsModeratorGuard)
    async getAdminClaimsStats(@Query('userId') userId?: string) {
        return this.claimsService.getUserClaimsStats(userId);
    }

    @Get('/admin/:claimId')
    @UseGuards(IsModeratorGuard)
    async getAdminClaim(@Param('claimId') claimId: string) {
        const claim = await this.claimsService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return claim;
    }

    @Post('/admin/:claimId/upload')
    @UseGuards(IsModeratorGuard)
    @DocumentsUploadInterceptor()
    async uploadAdminDocuments(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('claimId') claimId: string,
    ) {
        const claim = await this.claimsService.getClaim(claimId);

        if (!claim) {
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

    @Get('/documents/admin/')
    async getDocumentAdmin(
        @Query() query: GetDocumentAdminDto,
        @Res() res: Response,
    ) {
        const { documentId } = query;

        const document = await this.claimsService.getDocument(documentId);

        if (!document) {
            throw new NotFoundException(INVALID_DOCUMENT_ID);
        }

        const filePath = path.resolve(document.path);
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException(FILE_DOESNT_ON_DISK);
        }
        const fileName = path.basename(filePath);
        const mimeType = mimeLookup(filePath) || 'application/octet-stream';

        res.setHeader('Content-Type', mimeType);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(fileName)}"`,
        );

        return res.download(filePath);
    }

    @Post('/:claimId/upload')
    @DocumentsUploadInterceptor()
    async uploadDocuments(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('claimId') claimId: string,
        @Req() req: AuthRequest,
    ) {
        const claim = await this.claimsService.getClaim(claimId);

        if (!claim || claim.userId != req.user.id) {
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

    @UseGuards(IsModeratorGuard)
    @Put('/admin/:claimId')
    async updateClaim(
        @Body() dto: UpdateClaimDto,
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimsService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return await this.claimsService.updateClaim(dto, claimId);
    }

    @UseGuards(IsModeratorGuard)
    @Put('/customer/admin/:claimId')
    async updateCustomer(
        @Body() dto: CustomerDto,
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimsService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimsService.changeUpdatedAt(claimId);

        return await this.claimsService.updateCustomer(dto, claimId);
    }
    @UseGuards(IsModeratorGuard)
    @Put('/details/admin/:claimId')
    async updateFlight(
        @Body() dto: FlightDto,
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimsService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimsService.changeUpdatedAt(claimId);

        return await this.claimsService.updateFlight(dto, claimId);
    }
    @UseGuards(IsModeratorGuard)
    @Put('/issue/admin/:claimId')
    async updateIssue(
        @Body() dto: IssueDto,
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimsService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimsService.changeUpdatedAt(claimId);

        return await this.claimsService.updateIssue(dto, claimId);
    }
    @UseGuards(IsModeratorGuard)
    @Put('/payment/admin/:claimId')
    async updatePayment(
        @Body() dto: PaymentDto,
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimsService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimsService.changeUpdatedAt(claimId);

        return await this.claimsService.updatePayment(dto, claimId);
    }
    @UseGuards(IsModeratorGuard)
    @Put('/state/admin/:claimId')
    async updateState(
        @Body() dto: StateDto,
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimsService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimsService.changeUpdatedAt(claimId);

        return await this.claimsService.updateState(dto, claimId);
    }

    @UseGuards(IsModeratorGuard)
    @Put('/passenger/admin/:passengerId')
    async updatePassenger(
        @Body() dto: UpdatePassengerDto,
        @Param('passengerId') passengerId: string,
    ) {
        if (!(await this.claimsService.getOtherPassenger(passengerId))) {
            throw new BadRequestException(INVALID_PASSENGER_ID);
        }

        return await this.claimsService.updatePassenger(dto, passengerId);
    }
}

@Controller('claims')
export class PublicClaimsController {
    constructor(
        private readonly claimsService: ClaimsService,
        private readonly tokenService: TokenService,
        private readonly flightService: FlightsService,
        private readonly airportService: AirportsService,
        private readonly notificationService: NotificationsService,
        private readonly configService: ConfigService,
    ) {}

    @Post()
    async create(
        @Body() dto: CreateClaimDto,
        @Req() req: Request,
    ): Promise<IClaimWithJwt> {
        let user = getAuthJwt(req);

        if (user) {
            user = this.tokenService.verifyJWT<IJwtPayload>(user).id;
        }

        const claim = await this.claimsService.createClaim(dto, user);

        const jwt = this.tokenService.generateJWT<IClaimJwt>(
            {
                claimId: claim.id,
            },
            { expiresIn: '3days' },
        );

        return {
            claimData: claim,
            jwt,
        };
    }
    @Get('/passenger/:passengerId')
    async getPassenger(@Param('passengerId') passengerId: string) {
        const passenger =
            await this.claimsService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new NotFoundException(INVALID_PASSENGER_ID);
        }

        return passenger;
    }
    @Get('/customer/:customerId')
    async getCustomer(@Param('customerId') customerId: string) {
        const customer = await this.claimsService.getCustomer(customerId);

        if (!customer) {
            throw new NotFoundException(INVALID_CUSTOMER_ID);
        }

        return customer;
    }

    @Put('/:claimId/:passengerId/sign')
    async uploadOtherPassengerSign(
        @Body() body: UploadSignDto,
        @Param('claimId') claimId: string,
        @Param('passengerId') passengerId: string,
    ) {
        const { signature } = body;

        const passenger =
            await this.claimsService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new NotFoundException(INVALID_PASSENGER_ID);
        }

        if (passenger.isSigned) {
            return;
        }

        const claim = await this.claimsService.getClaim(passenger.claimId);

        if (!claim) {
            return;
        }

        const path = await this.claimsService.saveSignaturePdf(signature, {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            flightNumber: claim.details.flightNumber,
            date: claim.details.date,
            address: passenger.address,
            claimId: claim.id,
            airlineName: claim.details.airlines.name,
        });

        await this.claimsService.saveDocuments(
            [
                {
                    path,
                    name: `${passenger.firstName}_${passenger.lastName}-assignment_agreement.pdf`,
                },
            ],
            claimId,
        );

        await this.claimsService.setIsSignedPassenger(passengerId, true);
    }
    @Put('/:claimId/customer/:customerId/sign')
    async uploadCustomerSign(
        @Body() body: UploadSignDto,
        @Param('customerId') customerId: string,
        @Param('claimId') claimId: string,
    ) {
        const { signature } = body;

        const customer = await this.claimsService.getCustomer(customerId);

        if (!customer) {
            throw new NotFoundException(INVALID_PASSENGER_ID);
        }

        if (customer.isSigned) {
            return;
        }

        const claim = await this.claimsService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        const path = await this.claimsService.saveSignaturePdf(signature, {
            firstName: customer.firstName,
            lastName: customer.lastName,
            flightNumber: claim.details.flightNumber,
            date: claim.details.date,
            address: customer.address,
            claimId: claim.id,
            airlineName: claim.details.airlines.name,
        });

        await this.claimsService.saveDocuments(
            [
                {
                    path,
                    name: `${customer.firstName}_${customer.lastName}-assignment_agreement.pdf`,
                },
            ],
            claimId,
        );

        await this.claimsService.setIsSignedCustomer(customerId, true);
    }

    @Put('/:claimId/sign')
    async uploadSign(
        @Param('claimId') claimId: string,
        @Query() query: JwtQueryDto,
        @Body() body: UploadSignDto,
    ) {
        const { jwt } = query;
        const { signature } = body;

        const { claimId: jwtClaimId } =
            this.tokenService.verifyJWT<IClaimJwt>(jwt);

        if (claimId != jwtClaimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        const claim = await this.claimsService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        const path = await this.claimsService.saveSignaturePdf(signature, {
            firstName: claim.customer.firstName,
            lastName: claim.customer.lastName,
            flightNumber: claim.details.flightNumber,
            date: claim.details.date,
            address: claim.customer.address,
            claimId: claim.id,
            airlineName: claim.details.airlines.name,
        });

        await this.claimsService.saveDocuments(
            [
                {
                    path,
                    name: `${claim.customer.firstName}_${claim.customer.lastName}-assignment_agreement.pdf`,
                },
            ],
            claimId,
        );

        await this.claimsService.setIsSignedCustomer(claim.customerId, true);

        return SAVE_DOCUMENTS_SUCCESS;
    }

    @Post('/:claimId/passengers')
    async createOtherPassengers(
        @Query() query: JwtQueryDto,
        @Param('claimId') claimId: string,
        @Body() body: CreateOtherPassengersDto,
    ) {
        const { jwt } = query;
        const passengers = body.passengers;

        const { claimId: jwtClaimId } =
            this.tokenService.verifyJWT<IClaimJwt>(jwt);

        if (claimId != jwtClaimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        return this.claimsService.createOtherPassenger(passengers, claimId);
    }

    @Put('/:claimId/formState')
    async updateFormState(
        @Param('claimId') claimId: string,
        @Body() dto: UpdateFormStateDto,
        @Query() query: JwtQueryDto,
    ) {
        const { jwt } = query;

        const { claimId: jwtClaimId } =
            this.tokenService.verifyJWT<IClaimJwt>(jwt);

        if (claimId != jwtClaimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        await this.claimsService.updateFormState(claimId, dto.formState);
    }

    @Get('/:claimId/')
    async getClaim(@Param('claimId') claimId: string) {
        const claim = this.claimsService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        return claim;
    }

    @Put('/:claimId/')
    async updateClaim(
        @Body() dto: UpdateClaimDto,
        @Param('claimId') claimId: string,
        @Query() query: JwtStepQueryDto,
    ) {
        const { jwt, step, language } = query;

        const { claimId: jwtClaimId } =
            this.tokenService.verifyJWT<IClaimJwt>(jwt);

        if (claimId != jwtClaimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        const claim = await this.claimsService.updateStep(claimId, step);

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

        return await this.claimsService.updateClaim(dto, claimId);
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

        const compensation = this.claimsService.calculateCompensation(
            Object.assign(dto, { flightDistanceKm: distance }),
        );

        return {
            compensation,
        };
    }

    @Post('/:claimId/documents')
    @DocumentsUploadInterceptor()
    async uploadDocuments(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('claimId') claimId: string,
        @Query() query: JwtQueryDto,
    ) {
        const { jwt } = query;

        const { claimId: jwtClaimId } =
            this.tokenService.verifyJWT<IClaimJwt>(jwt);

        if (claimId != jwtClaimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        if (!(await this.claimsService.getClaim(claimId))) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.claimsService.updateStep(claimId, 8);

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
}
