import { IsString } from 'class-validator';

export class UploadSignDto {
    @IsString()
    claimId: string;

    @IsString()
    signature: string;
}
