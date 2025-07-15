import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { Languages } from '../languages/enums/languages.enums';
import { EmailService } from './email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
    constructor(
        private readonly emailService: EmailService,
        private readonly configService: ConfigService,
    ) {}

    async sendRegisterCode(to: string, code: number) {
        console.log(`Send register code: ${code} on ${to}`);
        await this.emailService.sendNoReplyEmail(
            to,
            `Your verification code is: ${code}`,
            `${code} is your SkyHelp verification code.`,
        );
    }

    async sendForgotPasswordCode(to: string, code: number) {
        console.log(`Send forgot password code: ${code} on ${to}`);
        await this.emailService.sendNoReplyEmail(
            to,
            `Your verification code is: ${code}`,
            `Verify your identity to log in to SkyHelp.`,
        );
    }
    async sendPasswordChanged(to: string) {
        await this.emailService.sendNoReplyEmail(
            to,
            `Your SkyHelp password has been changed`,
            `Your SkyHelp password has recently changed.`,
        );
    }

    async sendSubmitContactUsForm(
        email: string,
        subject: string,
        name: string,
        message: string,
        phone: string,
    ) {
        await this.emailService.sendNoReplyEmail(
            this.configService.getOrThrow('GMAIL_CONTACT_US_SUBMIT_EMAIL'),
            `New Contact Form Submission from ${name}`,
            `You have received a new message via the Contact Us form.

Name: ${name}
Email: ${email}
Phone: ${phone}

Subject: ${subject}

Message:
${message}

—
This message was automatically generated.
`,
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
        const letterTemplate = await this.getLetterTemplate(
            'createClaim.html',
            language,
        );

        const letter = letterTemplate
            .replace('{{claimId}}', claimData.id)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{claimLink}}', claimData.link)
            .replace('{{claimLink}}', claimData.link)
            .replace('{{registered}}', isRegistered ? '' : 'display: none;')
            .replace('{{notRegistered}}', isRegistered ? 'display: none;' : '');

        await this.emailService.sendNoReplyEmailHtml(
            to,
            `Your claim successfully submitted #${claimData.id}`,
            letter,
        );
    }

    async sendFinishClaim(
        to: string,
        claimData: {
            id: string;
            clientFirstName: string;
            compensation: number;
            continueClaimLink: string;
        },
        language: Languages = Languages.EN,
    ) {
        const letterTemplate = await this.getLetterTemplate(
            'finishClaim.html',
            language,
        );

        const letter = letterTemplate
            .replace('{{clientName}}', claimData.clientFirstName)
            .replace(
                '{{compensationAmount}}',
                claimData.compensation.toString(),
            )
            .replace('{{claimId}}', claimData.id)
            .replace('{{claimLink}}', claimData.continueClaimLink)
            .replace(
                '{{zeroCompensation}}',
                claimData.compensation == 0 ? '' : 'display: none;',
            )
            .replace(
                '{{notZeroCompensation}}',
                claimData.compensation == 0 ? 'display: none;' : '',
            );

        await this.emailService.sendNoReplyEmailHtml(
            to,
            'Just one step away from your compensation',
            letter,
        );
    }

    private async getLetterTemplate(
        fileName: string,
        language: Languages = Languages.EN,
    ): Promise<string> {
        return (
            await fs.readFile(
                path.join(
                    __dirname,
                    `../../../letters/${language}/${fileName}`,
                ),
            )
        ).toString();
    }
}
