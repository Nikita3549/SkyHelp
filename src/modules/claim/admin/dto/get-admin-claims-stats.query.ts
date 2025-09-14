import { IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAdminClaimsStatsQuery {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    dateFrom?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    dateTo?: Date;
}
