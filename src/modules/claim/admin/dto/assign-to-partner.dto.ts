import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignToPartnerDto {
    @IsString()
    referralCode: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    claimIds: string[];
}
