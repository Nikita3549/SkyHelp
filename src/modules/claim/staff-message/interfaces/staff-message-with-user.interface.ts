import { StaffMessage } from '@prisma/client';

export interface IStaffMessageWithUser extends StaffMessage {
    fromUser: {
        email: string;
        firstName: string;
        lastName: string;
        role: string;
    };
}
