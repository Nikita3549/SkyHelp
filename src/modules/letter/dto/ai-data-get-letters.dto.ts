import { IsString } from 'class-validator';

export class AiDataGetLettersDto {
    @IsString()
    claimId: string;
}
