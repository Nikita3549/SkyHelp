import {
    IsEmail,
    IsEnum,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MaxLength(128)
    @MinLength(10)
    password: string;

    @IsString()
    name: string;

    @IsString()
    secondName: string;

    @IsEnum(UserRole)
    role: UserRole;
}
