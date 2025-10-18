import { IsString } from 'class-validator';

export class SendMissingDocumentsEmailDto {
    @IsString()
    claimId: string;
}
