import { IsString } from 'class-validator';

export class SearchClaimsDto {
    @IsString()
    search: string;
}
