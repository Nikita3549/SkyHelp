import { EmailStatus } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class UpdateStatusDto {
    @IsEnum(EmailStatus)
    newStatus: EmailStatus;
}
