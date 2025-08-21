import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { Languages } from '../language/enums/languages.enums';
import { ConfigService } from '@nestjs/config';
import { isProd } from '../../utils/isProd';
import { GmailService } from '../gmail/gmail.service';
import {
    CREATE_CLAIM_FILENAME,
    FINISH_CLAIM_FILENAME,
    GENERATE_NEW_ACCOUNT_FILENAME,
} from './constants';
import { LETTERS_DIRECTORY_PATH } from '../../constants/LettersDirectoryPath';

@Injectable()
export class NotificationService {
    constructor(
        private readonly configService: ConfigService,
        private readonly gmailService: GmailService,
    ) {}

    async sendRegisterCode(to: string, code: number) {
        !isProd() && console.log(`Send register code: ${code} on ${to}`);

        await this.gmailService.noreply.sendEmail(
            to,
            `Your verification code is: ${code}`,
            `${code} is your SkyHelp verification code.`,
        );
    }

    async sendNewGeneratedAccount(
        to: string,
        userData: {
            email: string;
            password: string;
        },
        language: Languages = Languages.EN,
    ) {
        !isProd() &&
            console.log(
                `User data send: ${userData.email}, ${userData.password} on ${to}`,
            );

        const letterContentHtml = (
            await this.getLetterContent(GENERATE_NEW_ACCOUNT_FILENAME, language)
        )
            .replace('{{email}}', userData.email)
            .replace('{{password}}', userData.password)
            .replace(
                '{{resetPasswordLink}}',
                `${this.configService.getOrThrow('FRONTEND_HOST')}/forgot`,
            );

        const layoutHtml = await this.getLayout(language);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        await this.gmailService.noreply.sendEmailHtml(
            to,
            'Your SkyHelp account details',
            letterHtml,
        );
    }

    async sendForgotPasswordCode(to: string, code: number) {
        !isProd() && console.log(`Send forgot password code: ${code} on ${to}`);

        await this.gmailService.noreply.sendEmail(
            to,
            `Your verification code is: ${code}`,
            `Verify your identity to log in to SkyHelp.`,
        );
    }
    async sendPasswordChanged(to: string) {
        await this.gmailService.noreply.sendEmail(
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
        await this.gmailService.noreply.sendEmail(
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
        isRegistered: boolean, // deprecated param
        language: Languages = Languages.EN,
    ) {
        const letterTemplateHtml = await this.getLetterContent(
            CREATE_CLAIM_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml
            .replace('{{claimId}}', claimData.id)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{airlineName}}', claimData.airlineName)
            .replace('{{claimLink}}', claimData.link)
            .replace('{{claimLink}}', claimData.link)
            .replace('{{registered}}', isRegistered ? '' : 'display: none;')
            .replace('{{notRegistered}}', isRegistered ? 'display: none;' : '');

        const layoutHtml = await this.getLayout(language);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        await this.gmailService.noreply.sendEmailHtml(
            to,
            `Your claim successfully submitted #${claimData.id}`,
            letterHtml,
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
        if (!isProd()) return;

        const letterTemplateHtml = await this.getLetterContent(
            FINISH_CLAIM_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml
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

        const layoutHtml = await this.getLayout(language);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        await this.gmailService.noreply.sendEmailHtml(
            to,
            'Just one step away from your compensation',
            letterHtml,
        );
    }

    private async getLetterContent(
        fileName: string,
        language: Languages = Languages.EN,
    ): Promise<string> {
        return (
            await fs.readFile(
                path.join(LETTERS_DIRECTORY_PATH, `${language}/${fileName}`),
            )
        ).toString();
    }

    private async getLayout(
        language: Languages = Languages.EN,
    ): Promise<string> {
        return (
            await fs.readFile(
                path.join(LETTERS_DIRECTORY_PATH, `layout/${language}.html`),
            )
        ).toString();
    }

    private setContentInLayout(content: string, layout: string): string {
        return layout.replace('{{{content}}}', content);
    }
}
