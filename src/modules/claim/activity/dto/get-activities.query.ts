import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetActivitiesQuery {
    @IsOptional()
    @IsString()
    claimId: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number;
}
