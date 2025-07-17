import { IsString } from 'class-validator';

export class UploadAdminDocumentsDto {
    @IsString()
    claimId: string;
}
