import { UserRole } from '@prisma/client';

export interface IPublicUserData {
    uuid: string;
    email: string;
    name: string;
    secondName: string;
    role: UserRole;
    isActive: boolean;
    lastSign: Date;
    createdAt: Date;
}
