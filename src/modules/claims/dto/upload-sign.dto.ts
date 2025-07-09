import { IsString } from 'class-validator';

export class UploadSignDto {
    @IsString()
    signature: string;
}
