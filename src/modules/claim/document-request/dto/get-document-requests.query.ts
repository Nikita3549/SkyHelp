import { IsString } from 'class-validator';

export class GetDocumentRequestsQuery {
    @IsString()
    claimId: string;
}
