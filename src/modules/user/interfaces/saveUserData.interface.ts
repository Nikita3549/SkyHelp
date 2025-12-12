import { UserRole } from '@prisma/client';

export interface ISaveUserData {
    email: string;
    hashedPassword: string;
    name: string;
    secondName: string;
    role?: UserRole;
}
