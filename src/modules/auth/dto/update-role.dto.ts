import { IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateRoleDto {
    @IsUUID()
    userUuid: string;

    @IsEnum(UserRole)
    newRole: UserRole;
}
