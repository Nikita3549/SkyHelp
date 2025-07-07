import { Injectable, OnModuleInit } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import * as fs from 'fs/promises';
import * as path from 'node:path';

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

    async sendClaimCreated(
        to: string,
        claimData: {
            id: string;
            airlineName: string;
            link: string;
        },
    ) {
        const letterTemplateBuffer = await fs.readFile(
            path.join(__dirname, '../../../letters/createClaim.html'),
        );

        const letterTemplate = letterTemplateBuffer
            .toString()
            .replace('{{claimId}}', claimData.id)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{claimLink}}', claimData.link);

        await this.gmail.sendNoReplyEmailHtml(
            to,
            `Your claim successfully submitted #${claimData.id}`,
            letterTemplate,
        );
    }
}
