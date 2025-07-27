import { IsOptional, IsString } from 'class-validator';

export class GetLettersQueryDto {
    @IsOptional()
    @IsString()
    dialogWith?: string;

    @IsOptional()
    @IsString()
    pageToken?: string;
}
