import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ENSURE_DOCUMENT_REQUESTS_QUEUE_KEY } from '../constants';
import { Job } from 'bullmq';
import { IEnsureDocumentRequestsJobData } from '../interfaces/ensure-document-requests-job-data.interface';
import { ClaimService } from '../claim.service';

@Processor(ENSURE_DOCUMENT_REQUESTS_QUEUE_KEY)
export class EnsureDocumentRequestsProcessor extends WorkerHost {
    constructor(private readonly claimService: ClaimService) {
        super();
    }
    async process(job: Job<IEnsureDocumentRequestsJobData>) {
        await this.claimService.ensureDocumentRequests(job.data.claimId);
    }
}
