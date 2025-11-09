import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreatePartnerDto {
    @IsString()
    referralCode: string;

    @IsString()
    userId: string;

    @IsOptional()
    @IsEnum(UserRole)
    userRole: UserRole = UserRole.PARTNER;
}
