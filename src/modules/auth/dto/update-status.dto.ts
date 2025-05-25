import { IsBoolean, IsUUID } from 'class-validator';

export class UpdateStatusDto {
    @IsUUID()
    userUuid: string;

    @IsBoolean()
    isActive: boolean;
}
