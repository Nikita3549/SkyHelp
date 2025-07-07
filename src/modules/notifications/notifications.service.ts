import { Injectable } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { Languages } from '../languages/enums/languages.enums';

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
        isRegistered: boolean,
        language: Languages = Languages.EN,
    ) {
        const letterTemplateBuffer = await fs.readFile(
            path.join(
                __dirname,
                `../../../letters/${language}/createClaim.html`,
            ),
        );

        const letterTemplate = letterTemplateBuffer
            .toString()
            .replace('{{claimId}}', claimData.id)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{claimLink}}', claimData.link)
            .replace('{{claimLink}}', claimData.link)
            .replace('{{registered}}', isRegistered ? '' : 'display: none;')
            .replace('{{notRegistered}}', isRegistered ? 'display: none;' : '');

        await this.gmail.sendNoReplyEmailHtml(
            to,
            `Your claim successfully submitted #${claimData.id}`,
            letterTemplate,
        );
    }
}
