import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class GetUsersDto {
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}
