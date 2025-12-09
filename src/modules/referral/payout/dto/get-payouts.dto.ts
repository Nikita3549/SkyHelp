import { IsOptional, IsString } from 'class-validator';

export class GetPayoutsDto {
    @IsOptional()
    @IsString()
    userId?: string;
}
