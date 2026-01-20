import { UserRole } from '@prisma/client';

export interface IStaffChat {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: UserRole;
    };
}
