import { IsString } from 'class-validator';

export class AssignToPartnerDto {
    @IsString()
    referralCode: string;
}
