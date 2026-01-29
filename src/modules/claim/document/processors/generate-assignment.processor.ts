import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { generateAssignmentName } from '../../../../common/utils/generate-assignment-name';
import { IParentalAssignmentData } from '../services/assignment/interfaces/parental-assignment-data.interface';
import { IAssignmentData } from '../services/assignment/interfaces/assignment-data.interface';
import { ClaimRecentUpdatesType, DocumentType } from '@prisma/client';
import { IGenerateAssignmentJobData } from './interfaces/generateAssignmentJobData';
import { RecentUpdatesService } from '../../recent-updates/recent-updates.service';
import { DocumentAssignmentService } from '../services/assignment/document-assignment.service';
import { DocumentService } from '../services/document.service';
import { ClaimService } from '../../claim.service';
import { GENERATE_ASSIGNMENT_QUEUE_KEY } from './constants/generate-assignment-queue-key';

@Processor(GENERATE_ASSIGNMENT_QUEUE_KEY)
export class GenerateAssignmentProcessor extends WorkerHost {
    constructor(
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly documentAssignmentService: DocumentAssignmentService,
        private readonly documentService: DocumentService,
        private readonly claimService: ClaimService,
    ) {
        super();
    }

    async process(job: Job<IGenerateAssignmentJobData>) {
        try {
            const { claim, passenger, options, signature } = job.data;
            const assignmentFileName = generateAssignmentName(
                passenger.firstName,
                passenger.lastName,
                new Date(),
            );

            const commonData: IAssignmentData = {
                claimId: claim.id,
                fileName: assignmentFileName,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                address: passenger.address,
                airlineName: claim.details.airlines.name,
                date: new Date(claim.details.date),
                flightNumber: claim.details.flightNumber,
                signDate: new Date(),
            };

            let result;
            if (options?.isParental && !passenger.isCustomer) {
                const assignmentData: IParentalAssignmentData = {
                    ...commonData,
                    minorBirthday: new Date(passenger.birthday!),
                    parentFirstName: passenger.parentFirstName!,
                    parentLastName: passenger.parentLastName!,
                };
                result =
                    await this.documentAssignmentService.saveParentalSignature(
                        signature,
                        assignmentData,
                    );
            } else {
                const assignmentData: IAssignmentData = commonData;
                result = await this.documentAssignmentService.saveSignature(
                    signature,
                    assignmentData,
                );
            }

            const [document] = await this.documentService.saveDocuments(
                [
                    {
                        buffer: result.buffer,
                        name: assignmentFileName,
                        passengerId: passenger.id,
                        documentType: DocumentType.ASSIGNMENT,
                        mimetype: 'application/pdf',
                    },
                ],
                claim.id,
                {
                    handleIsAllDocumentsUploaded:
                        !!options?.checkIfAllDocumentsUploaded,
                },
            );

            if (options?.saveRecentUpdate) {
                await this.recentUpdatesService.saveRecentUpdate(
                    {
                        type: ClaimRecentUpdatesType.DOCUMENT,
                        updatedEntityId: document.id,
                        entityData: document.name,
                        documentType: DocumentType.ASSIGNMENT,
                    },
                    claim.id,
                );
            }
        } catch (e) {
            console.error(e);
        }
    }
}
