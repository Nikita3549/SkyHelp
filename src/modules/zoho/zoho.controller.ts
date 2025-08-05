import {
    Body,
    ConflictException,
    Controller,
    HttpStatus,
    NotFoundException,
    Post,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ZohoService } from './zoho.service';
import { GenerateSignLinkDto } from './dto/generate-sign-link.dto';
import { ClaimService } from '../claim/claim.service';
import { TokenService } from '../token/token.service';
import { validateClaimJwt } from '../../utils/validate-claim-jwt';
import {
    INVALID_CLAIM_ID,
    INVALID_CUSTOMER_ID,
    INVALID_PASSENGER_ID,
} from '../claim/constants';
import { IsZohoGuard } from './guards/isZoho.guard';
import { IdempotencyInterceptor } from './interceptors/IdempotencyInterceptor';
import { DocumentType, SignScenario, SignScenarioType } from '@prisma/client';
import { Request, Response } from 'express';
import { IZohoWebhookBody } from './interfaces/zoho-webhook-body.interface';
import { DocumentService } from '../claim/document/document.service';
import { CustomerService } from '../claim/customer/customer.service';
import { OtherPassengerService } from '../claim/other-passenger/other-passenger.service';
import { ALREADY_SIGNED_EXCEPTION } from './constants';
import { IFullClaim } from '../claim/interfaces/full-claim.interface';
import { IAssignmentData } from './interfaces/assignment-data.interface';

@Controller('zoho')
export class ZohoController {
    constructor(
        private readonly zohoService: ZohoService,
        private readonly claimService: ClaimService,
        private readonly tokenService: TokenService,
        private readonly otherPassengerService: OtherPassengerService,
        private readonly documentService: DocumentService,
        private readonly customerService: CustomerService,
    ) {}

    @Post('link')
    async generateSignLink(@Body() dto: GenerateSignLinkDto) {
        const { claimId, scenario, passengerId, jwt, customerId } = dto;

        const validators = {
            [SignScenarioType.MainFlow]: () =>
                this.validateMainFlow(claimId, jwt),
            [SignScenarioType.ExternalFlow]: () =>
                this.validateExternalFlow(claimId, customerId),
            [SignScenarioType.OtherPassenger]: () =>
                this.validateOtherPassenger(claimId, passengerId),
        };

        const assignmentData = await validators[scenario]();

        return {
            link: await this.zohoService.generateSignLink(
                assignmentData,
                scenario,
            ),
        };
    }

    @Post('webhook')
    @UseGuards(IsZohoGuard)
    @UseInterceptors(IdempotencyInterceptor)
    async handleZohoWebhook(@Req() req: Request, @Res() res: Response) {
        const body = JSON.parse(req.body.toString()) as IZohoWebhookBody;
        const requestId = body.requests.request_id;

        const scenarioEntity = await this.zohoService.getScenario(requestId);
        if (!scenarioEntity) return;

        switch (scenarioEntity.scenario) {
            case SignScenarioType.MainFlow:
                await this.handleMainFlow(body, scenarioEntity);
                break;
            case SignScenarioType.ExternalFlow:
                await this.handleExternalFlow(body, scenarioEntity);
                break;
            case SignScenarioType.OtherPassenger:
                await this.handleOtherPassengerFlow(body, scenarioEntity);
                break;
        }

        res.status(HttpStatus.OK).send();
    }

    /*----------------------- HANDLE SCENARIOS -----------------------*/

    private async handleMainFlow(
        body: IZohoWebhookBody,
        scenarioEntity: SignScenario,
    ) {
        const { path } = await this.zohoService.saveDocumentById(
            body.requests.request_id,
            body.requests.document_ids[0].document_id,
        );

        const claim = await this.claimService.getClaim(scenarioEntity.claimId);

        if (!claim) {
            return;
        }

        await this.documentService.saveDocuments(
            [
                {
                    path,
                    name: `${claim.customer.firstName}_${claim.customer.lastName}-assignment_agreement.pdf`,
                },
            ],
            claim.id,
            DocumentType.ASSIGNMENT,
        );

        await this.claimService.updateStep(claim.id, 7);

        await this.customerService.setIsSignedCustomer(claim.customerId, true);
    }

    private async handleExternalFlow(
        body: IZohoWebhookBody,
        scenarioEntity: SignScenario,
    ) {
        const { path } = await this.zohoService.saveDocumentById(
            body.requests.request_id,
            body.requests.document_ids[0].document_id,
        );

        const claim = await this.claimService.getClaim(scenarioEntity.claimId);

        if (!claim) {
            return;
        }

        const customer = await this.customerService.getCustomer(
            claim.customer.id,
        );

        if (!customer) {
            return;
        }

        await this.documentService.saveDocuments(
            [
                {
                    path,
                    name: `${claim.customer.firstName}_${claim.customer.lastName}-assignment_agreement.pdf`,
                },
            ],
            claim.id,
            DocumentType.ASSIGNMENT,
        );

        await this.customerService.setIsSignedCustomer(customer.id, true);
    }

    private async handleOtherPassengerFlow(
        body: IZohoWebhookBody,
        scenarioEntity: SignScenario,
    ) {
        const { path } = await this.zohoService.saveDocumentById(
            body.requests.request_id,
            body.requests.document_ids[0].document_id,
        );

        const passenger = await this.otherPassengerService.getOtherPassenger(
            scenarioEntity.passengerId!,
        );

        if (!passenger) {
            return;
        }

        const claim = await this.claimService.getClaim(passenger.claimId);

        if (!claim) {
            return;
        }

        await this.documentService.saveDocuments(
            [
                {
                    path,
                    name: `${passenger.firstName}_${passenger.lastName}-assignment_agreement.pdf`,
                },
            ],
            claim.id,
            DocumentType.ASSIGNMENT,
        );

        await this.otherPassengerService.setIsSignedPassenger(
            passenger.id,
            true,
        );
    }

    /*----------------------- VALIDATE SCENARIOS -----------------------*/

    private async validateMainFlow(
        claimId: string,
        jwt?: string,
    ): Promise<IAssignmentData> {
        if (!jwt) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

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
            claimId: claim.id,
            firstName: claim.customer.firstName,
            lastName: claim.customer.lastName,
            address: claim.customer.address,
            date: claim.details.date,
            flightNumber: claim.details.flightNumber,
            airlineName: claim.details.airlines.name,
            recipientEmail: claim.customer.email,
        };
    }

    private async validateExternalFlow(
        claimId: string,
        customerId?: string,
    ): Promise<IAssignmentData> {
        if (!customerId) {
            throw new NotFoundException(INVALID_CUSTOMER_ID);
        }
        const customer = await this.customerService.getCustomer(customerId);

        if (!customer) {
            throw new NotFoundException(INVALID_CUSTOMER_ID);
        }

        if (customer.isSigned) {
            throw new ConflictException(ALREADY_SIGNED_EXCEPTION);
        }

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        return {
            claimId: claim.id,
            firstName: claim.customer.firstName,
            lastName: claim.customer.lastName,
            address: claim.customer.address,
            date: claim.details.date,
            flightNumber: claim.details.flightNumber,
            airlineName: claim.details.airlines.name,
            recipientEmail: claim.customer.email,
        };
    }

    private async validateOtherPassenger(
        claimId: string,
        passengerId?: string,
    ): Promise<IAssignmentData> {
        if (!passengerId) {
            throw new NotFoundException(INVALID_PASSENGER_ID);
        }

        const passenger =
            await this.otherPassengerService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new NotFoundException(INVALID_PASSENGER_ID);
        }

        if (passenger.isSigned) {
            throw new ConflictException(ALREADY_SIGNED_EXCEPTION);
        }

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        return {
            claimId: claim.id,
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            address: passenger.address,
            date: claim.details.date,
            flightNumber: claim.details.flightNumber,
            airlineName: claim.details.airlines.name,
            recipientEmail: passenger.email!,
        };
    }
}
