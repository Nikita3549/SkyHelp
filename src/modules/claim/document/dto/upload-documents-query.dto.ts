import { IsString } from 'class-validator';

export class UploadDocumentsQueryDto {
    @IsString()
    claimId: string;
}
