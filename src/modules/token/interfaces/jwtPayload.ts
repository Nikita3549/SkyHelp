import { UserRole } from '@prisma/client';

export interface IJwtPayload {
    id: string;
    email: string;
    name: string;
    secondName: string;
    role: UserRole;
    isActive: boolean;
}
