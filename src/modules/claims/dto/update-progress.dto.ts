import { ProgressStatus } from '@prisma/client';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateProgressDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsISO8601()
    endAt: string | null;

    @IsString()
    status: ProgressStatus;
}
