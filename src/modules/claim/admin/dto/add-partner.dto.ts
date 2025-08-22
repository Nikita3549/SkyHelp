import { IsString } from 'class-validator';

export class AddPartnerDto {
    @IsString()
    partnerId: string;
}
