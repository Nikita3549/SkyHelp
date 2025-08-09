import { IsJWT, IsString } from 'class-validator';

export class UploadFormSignDto {
    @IsString()
    claimId: string;

    @IsString()
    signature: string;
}
