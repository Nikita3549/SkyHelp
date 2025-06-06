import { Injectable } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';

@Injectable()
export class NotificationsService {
    constructor(private readonly gmail: GmailService) {}
    async sendRegisterCode(to: string, code: number) {
        console.log(`Send register code: ${code} on ${to}`);
        await this.gmail.sendNoReplyEmail(
            to,
            `Your verification code is: ${code}`,
            `${code} is your SkyHelp verification code.`,
        );
    }

    async sendForgotPasswordCode(to: string, code: number) {
        console.log(`Send forgot password code: ${code} on ${to}`);
        await this.gmail.sendNoReplyEmail(
            to,
            `Your verification code is: ${code}`,
            `Verify your identity to log in to SkyHelp.`,
        );
    }
    async sendPasswordChanged(to: string) {
        await this.gmail.sendNoReplyEmail(
            to,
            `Your SkyHelp password has been changed`,
            `Your SkyHelp password has recently changed.`,
        );
    }
}
