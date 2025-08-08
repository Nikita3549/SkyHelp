import { IsString } from 'class-validator';

export class GenerateJwtDto {
    @IsString()
    claimId: string;
}
