import { IsJWT, IsOptional, IsString } from 'class-validator';

export class UploadSignDto {
    @IsString()
    signature: string;

    @IsJWT()
    jwt: string;

    @IsOptional()
    @IsString()
    documentRequestId?: string;

    @IsOptional()
    @IsString()
    parentFirstName?: string;

    @IsOptional()
    @IsString()
    parentLastName?: string;
}
