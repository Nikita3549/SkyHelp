import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    async sendRegisterCode(email: string, code: number) {
        // Mock for development
        console.log(`Send register code: ${code} on ${email}`);
    }

    async sendForgotPasswordCode(email: string, code: number) {
        // Mock for development
        console.log(`Send forgot password code: ${code} on ${email}`);
    }
}
