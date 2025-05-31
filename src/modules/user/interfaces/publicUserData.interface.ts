import { UserRole } from '@prisma/client';

export interface IPublicUserData {
    id: string;
    email: string;
    name: string;
    secondName: string;
    role: UserRole;
    isActive: boolean;
    lastSign: Date;
    createdAt: Date;
}
