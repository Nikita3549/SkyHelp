import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EmailStatus, EmailType } from '@prisma/client';

export class GetLettersQueryDto {
    @IsOptional()
    @Transform(({ value }) => (value === 'null' ? null : value))
    claimId?: string | null;

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
