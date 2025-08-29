import { IsNumber, IsString } from 'class-validator';
import { IsValidProgress } from '../validators/isValidProgress';
import { ProgressStatus } from '@prisma/client';

export class CreateProgressDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    // Dummy field to trigger custom validator that checks title+description pair
    // The validator actually inspects `title` and `description`, not this field itself
    @IsValidProgress()
    validatePair: boolean;

    @IsNumber()
    order: number;
}
