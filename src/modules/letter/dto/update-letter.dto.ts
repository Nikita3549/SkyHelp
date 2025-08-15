import { IsString } from 'class-validator';

export class UpdateLetterDto {
    @IsString()
    claimId: string;
}
