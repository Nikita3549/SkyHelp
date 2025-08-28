import { ProgressStatus } from '@prisma/client';
import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';
import { IsValidProgress } from '../validators/isValidProgress';

export class UpdateProgressDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    // Dummy field to trigger custom validator that checks title+description pair
    // The validator actually inspects `title` and `description`, not this field itself
    @IsValidProgress()
    validatePair: boolean;

    @IsOptional()
    @IsISO8601()
    endAt: string | null;

    @IsString()
    status: ProgressStatus;

    @IsNumber()
    order: number;
}
