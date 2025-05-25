import { UserRole } from '@prisma/client';

export interface IJwtPayload {
    uuid: string;
    email: string;
    name: string;
    secondName: string;
    role: UserRole;
    isActive: boolean;
}
