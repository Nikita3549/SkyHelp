import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class DeleteFromPartnerDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    claimIds: string[];
}
