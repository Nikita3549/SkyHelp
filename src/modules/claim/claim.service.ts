import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CancellationNotice,
    ClaimStatus,
    DelayCategory,
    DocumentRequestReason,
    DocumentRequestStatus,
    DocumentRequestType,
    DocumentType,
    Prisma,
    Progress,
} from '@prisma/client';
import { CreateClaimDto } from './dto/create-claim.dto';
import { IGetCompensation } from './interfaces/compensation.interface';
import { InjectQueue } from '@nestjs/bullmq';
import {
    CLAIM_FOLLOWUP_QUEUE_KEY,
    CONTINUE_LINKS_EXP,
    ENSURE_DOCUMENT_REQUESTS_QUEUE_KEY,
    FIVE_DAYS,
    FOUR_DAYS,
    SIX_DAYS,
    THREE_DAYS,
    TWO_DAYS,
} from './constants';
import { Queue } from 'bullmq';
import { IJobClaimFollowupData } from './interfaces/job-data/job-data.interface';
import { ConfigService } from '@nestjs/config';
import { IClaimJwt } from './interfaces/claim-jwt.interface';
import { TokenService } from '../token/token.service';
import { DAY, HOUR } from '../../common/constants/time.constants';
import { getNextWorkTime } from '../../common/utils/getNextWorkTime';
import { generateNumericId } from '../../common/utils/generateNumericId';
import { ProgressService } from './progress/progress.service';
import { ProgressVariants } from './progress/constants/progresses/progressVariants';
import { DocumentRequestService } from './document-request/document-request.service';
import { ClaimPersistenceService } from '../claim-persistence/services/claim-persistence.service';
import { DuplicateService } from './duplicate/duplicate.service';
import { IFullClaim } from '../claim-persistence/types/claim-persistence.types';
import { ICreateClaimExtraData } from './interfaces/create-claim-extra-data.interface';
import { IEnsureDocumentRequestsJobData } from './interfaces/ensure-document-requests-job-data.interface';

@Injectable()
export class ClaimService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue(CLAIM_FOLLOWUP_QUEUE_KEY)
        private readonly claimFollowupQueue: Queue,
        @InjectQueue(ENSURE_DOCUMENT_REQUESTS_QUEUE_KEY)
        private readonly ensureDocumentRequestsQueue: Queue,
        private readonly configService: ConfigService,
        private readonly tokenService: TokenService,
        private readonly progressService: ProgressService,
        private readonly documentRequestService: DocumentRequestService,
        private readonly claimPersistenceService: ClaimPersistenceService,
        private readonly duplicateService: DuplicateService,
    ) {}

    async ensureDocumentRequests(claimId: string) {
        const claim = await this.claimPersistenceService.findOneById(claimId);
        if (!claim) {
            throw new Error(
                "Couldn't find claim while ensure document requests process",
            );
        }
        const allPassengers = [claim.customer, ...claim.passengers];
        const reqs = await this.documentRequestService.getByClaimId(claim.id);

        for (const passenger of allPassengers) {
            const documents = claim.documents.filter(
                (d) => passenger.id == d.passengerId,
            );

            const checkAndCreate = async (
                typesToCheck: DocumentType[],
                typeToCreate: DocumentRequestType,
            ) => {
                const hasDoc = typesToCheck.some((type) =>
                    documents.some((doc) => doc.type === type),
                );
                const hasReqs = reqs.some((r) => r.type == typeToCreate);

                if (!hasDoc && !hasReqs) {
                    await this.documentRequestService.create({
                        type: typeToCreate,
                        claimId: claim.id,
                        passengerId: passenger.id,
                        reason: DocumentRequestReason.MISSING_DOCUMENT,
                    });
                }
            };

            await Promise.all([
                await checkAndCreate(
                    [
                        DocumentType.DOCUMENT,
                        DocumentType.ETICKET,
                        DocumentType.BOARDING_PASS,
                    ],
                    DocumentRequestType.BOARDING_PASS,
                ),
                await checkAndCreate(
                    [DocumentType.ASSIGNMENT],
                    DocumentRequestType.ASSIGNMENT,
                ),
                await checkAndCreate(
                    [DocumentType.PASSPORT],
                    DocumentType.PASSPORT,
                ),
            ]);
        }
    }

    async handleAllDocumentsUploaded(claimId: string) {
        type RequiredDocumentGroups = {
            [key: string]: DocumentType[];
        };

        const requiredDocumentGroups: RequiredDocumentGroups = {
            Document: [
                DocumentType.ETICKET,
                DocumentType.DOCUMENT,
                DocumentType.BOARDING_PASS,
            ],
            Passport: [DocumentType.PASSPORT],
            Assignment: [DocumentType.ASSIGNMENT],
        };

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            return;
        }
        if (
            claim.state.progress.some(
                (p) =>
                    p.description ==
                    ProgressVariants.claimReceived.descriptions[1],
            )
        ) {
            return;
        }
        const documentRequests =
            await this.documentRequestService.getByClaimId(claimId);

        const allPassengers = [claim.customer, ...claim.passengers];

        const allDocumentsPresent = allPassengers.every((passenger) => {
            const passengerDocs = claim.documents.filter(
                (d) => d.passengerId === passenger.id,
            );

            return Object.values(requiredDocumentGroups).every(
                (requiredTypes) =>
                    passengerDocs.some((doc) =>
                        requiredTypes.includes(doc.type),
                    ),
            );
        });

        if (!allDocumentsPresent) {
            return;
        }

        if (
            (claim.state.status != ClaimStatus.LEGAL_PROCESS &&
                claim.state.status != ClaimStatus.DOCS_REQUESTED) ||
            documentRequests.some(
                (d) => d.status === DocumentRequestStatus.ACTIVE,
            )
        ) {
            return;
        }

        await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const progressVariant = Object.values(ProgressVariants).find(
                (v) => v.status == ClaimStatus.CLAIM_RECEIVED,
            );
            if (!progressVariant) {
                return;
            }
            await this.progressService.createProgress(
                {
                    title: progressVariant.title,
                    description: progressVariant.descriptions[1],
                    order:
                        claim.state.progress.reduce(
                            (max: Progress, current: Progress) => {
                                if (!max || current.order > max.order) {
                                    return current;
                                }
                                return max;
                            },
                            claim.state.progress[0],
                        ).order + 1,
                    descriptionVariables: [],
                },
                claim.state.id,
                tx,
            );

            await this.claimPersistenceService.updateStatus(
                ClaimStatus.CLAIM_RECEIVED,
                claimId,
                tx,
            );
        });
    }

    async scheduleEnsureDocumentRequests(
        jobData: IEnsureDocumentRequestsJobData,
    ) {
        await this.ensureDocumentRequestsQueue.add(
            'ensureDocumentRequests',
            jobData,
        );
    }

    async scheduleClaimFollowUpEmails(jobData: IJobClaimFollowupData) {
        const delays = [
            HOUR,
            HOUR * 5,
            DAY,
            TWO_DAYS,
            THREE_DAYS,
            FOUR_DAYS,
            FIVE_DAYS,
            SIX_DAYS,
        ];

        delays.forEach(async (delay) => {
            await this.claimFollowupQueue.add('followUpClaim', jobData, {
                delay: getNextWorkTime(delay),
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
            });
        });
    }

    async createClaim(
        claimData: CreateClaimDto,
        extraData: ICreateClaimExtraData,
    ): Promise<{
        claim: IFullClaim;
        jwt: string;
    }> {
        const duplicatedClaims =
            await this.claimPersistenceService.findDuplicate({
                email: claimData.customer.email,
                firstName: claimData.customer.firstName,
                lastName: claimData.customer.lastName,
                flightNumber: claimData.details.flightNumber,
            });

        const maxAttempts = 5;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const numericId = generateNumericId();

            const jwt = this.tokenService.generateJWT<IClaimJwt>(
                {
                    claimId: numericId,
                },
                { expiresIn: CONTINUE_LINKS_EXP },
            );
            const continueClaimLink = `${this.configService.getOrThrow('FRONTEND_URL')}/claim?claimId=${numericId}&jwt=${jwt}`;

            try {
                const claim = await this.claimPersistenceService.save(
                    claimData,
                    {
                        ...extraData,
                        continueClaimLink,
                        duplicatedClaims,
                        numericId,
                    },
                );

                await this.duplicateService.updateMany(
                    duplicatedClaims.map((claim) => claim.id),
                    claim.id,
                );

                return {
                    claim,
                    jwt,
                };
            } catch (error) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002'
                ) {
                    continue;
                }

                throw error;
            }
        }

        throw new Error(
            'Failed to generate unique numericId after multiple attempts.',
        );
    }

    calculateCompensation(compensation: IGetCompensation): number {
        const {
            flightDistanceKm,
            delayHours,
            cancellationNoticeDays,
            wasDeniedBoarding,
            wasAlternativeFlightOffered,
            arrivalTimeDelayOfAlternative,
            airlineIcao,
        } = compensation;

        if (!flightDistanceKm) {
            throw new Error('Internal error while calculating compensation');
        }

        const delayIsLessThan3h = delayHours === DelayCategory.less_than_3hours;
        const cancellationNoticeIs14daysOrMore =
            cancellationNoticeDays === CancellationNotice.fourteen_days_or_more;

        if (
            (delayIsLessThan3h && !wasDeniedBoarding) ||
            cancellationNoticeIs14daysOrMore
        ) {
            return 0;
        }

        const isEligibleDueToDelay =
            delayHours === DelayCategory.threehours_or_more ||
            delayHours === DelayCategory.never_arrived;

        const isEligibleDueToCancellation =
            cancellationNoticeDays === CancellationNotice.less_than_14days;
        const isEligibleDueToDeniedBoarding = wasDeniedBoarding;

        const eligible =
            isEligibleDueToDelay ||
            isEligibleDueToCancellation ||
            isEligibleDueToDeniedBoarding;

        if (!eligible) {
            return 0;
        }

        let baseCompensation = 0;

        if (flightDistanceKm <= 1500) {
            baseCompensation = 250;
        } else if (flightDistanceKm <= 3500) {
            baseCompensation = 400;
        } else {
            baseCompensation = 600;
        }

        if (
            isEligibleDueToCancellation &&
            wasAlternativeFlightOffered &&
            this.arrivalDelayWithinThreshold(
                flightDistanceKm,
                arrivalTimeDelayOfAlternative,
            )
        ) {
            baseCompensation = baseCompensation / 2;
        }

        if (airlineIcao == 'WMT') {
            // Wizz Air Malta
            baseCompensation -= 50;
        }

        return baseCompensation;
    }

    private arrivalDelayWithinThreshold(
        distance: number,
        delay: number,
    ): boolean {
        if (distance <= 1500) {
            return delay < 2;
        } else if (distance <= 3500) {
            return delay < 3;
        } else {
            return delay < 4;
        }
    }
}
