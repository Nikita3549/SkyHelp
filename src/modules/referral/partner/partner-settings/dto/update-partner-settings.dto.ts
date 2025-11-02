import { IsBoolean, IsEmail, IsOptional } from 'class-validator';

export class UpdatePartnerSettingsDto {
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsBoolean()
    @IsOptional()
    paymentAlerts?: boolean;
}
