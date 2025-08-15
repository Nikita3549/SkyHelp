import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailStatus, EmailType } from '@prisma/client';

export class GetLettersQueryDto {
    @IsOptional()
    @IsString()
    claimId?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number;

    @IsOptional()
    @IsEnum(EmailStatus)
    status?: EmailStatus;

    @IsOptional()
    @IsEnum(EmailType)
    type?: EmailType;
}
