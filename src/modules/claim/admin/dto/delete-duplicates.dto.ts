import { IsString } from 'class-validator';

export class DeleteDuplicatesDto {
    @IsString()
    claimId: string;
}
