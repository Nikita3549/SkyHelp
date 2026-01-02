import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../token/token.service';
import { S3Service } from '../../s3/s3.service';
import { Languages } from '../../language/enums/languages.enums';
import { EmailCategory } from '../../gmail/enums/email-type.enum';
import { UnsubscribeJwt } from '../../unsubscribe-email/interfaces/unsubscribe-jwt';
import { gmail_v1 } from 'googleapis';
import * as handlebars from 'handlebars';
import { SUPPORTED_LETTER_LANGUAGES } from '../constants/supported-languages';
import { IProcessAndSendOptions } from '../interfaces/process-and-send-options.interface';
import { ILetterData } from '../interfaces/process-letter-data.interface';
import { GmailNoreplyService } from '../../gmail/services/gmail-noreply.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class EmailSenderService {
    constructor(
        private readonly configService: ConfigService,
        private readonly tokenService: TokenService,
        private readonly S3Service: S3Service,
        private readonly gmailNoreplyService: GmailNoreplyService,
        private readonly emailService: EmailService,
    ) {
        handlebars.registerHelper('eq', (a: string, b: string) => a === b);
    }

    async processAndSend(
        letterData: ILetterData,
        options?: IProcessAndSendOptions,
    ) {
        const { to, emailCategory, language, subject, claimId } = letterData;

        const supportedLanguage = SUPPORTED_LETTER_LANGUAGES.includes(language)
            ? language
            : Languages.EN;

        const { letterHtml } = await this.render({
            ...letterData,
            language: supportedLanguage,
        });

        const email = await this.gmailNoreplyService.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        if (options?.saveInDb) {
            await this.saveHtmlEmail({
                email,
                subject,
                claimId: claimId,
                contentHtml: letterHtml,
                to,
            });
        }
    }

    private async render(letterData: ILetterData): Promise<{
        letterHtml: string;
    }> {
        const { to, context, emailCategory, templateFilename, language } =
            letterData;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
            templateFilename,
            language,
        );

        const handlebarsTemplate = handlebars.compile(letterTemplateHtml);

        const letterContentHtml = handlebarsTemplate(context);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        return {
            letterHtml,
        };
    }

    private async getLayout(
        to: string,
        language: Languages = Languages.EN,
        emailCategory: EmailCategory = EmailCategory.TRANSACTIONAL,
    ): Promise<string> {
        const layout = (
            await this.S3Service.getPublicFile(
                `/letters/layout/${emailCategory == EmailCategory.MARKETING ? 'unsubscribe/' : ''}${language}.html`,
            )
        )
            .toString()
            .replaceAll('{{domain}}', this.configService.getOrThrow('DOMAIN'));

        if (emailCategory == EmailCategory.TRANSACTIONAL) {
            return layout;
        }

        const jwt = this.tokenService.generateJWT<UnsubscribeJwt>({
            email: to,
        });

        return layout.replaceAll('{{email}}', to).replace('{{jwt}}', jwt);
    }

    private setContentInLayout(content: string, layout: string): string {
        return layout.replace('{{{content}}}', content);
    }

    private async saveHtmlEmail(data: {
        email: gmail_v1.Schema$Message | undefined;
        subject: string;
        contentHtml: string;
        to: string;
        claimId?: string;
    }) {
        const { email, subject, contentHtml, to, claimId } = data;

        if (email) {
            await this.emailService.saveEmail({
                id: email.id!,
                threadId: email.threadId!,
                subject,
                normalizedSubject: subject,
                messageId: email.id!,
                fromName: 'SkyHelp',
                fromEmail: this.configService.getOrThrow('GMAIL_NOREPLY_EMAIL'),
                toEmail: to,
                bodyHtml: contentHtml,
                claimId: claimId,
                isInbox: false,
            });
        }
    }

    private async getLetterContentTemplate(
        fileName: string,
        language: Languages = Languages.EN,
    ): Promise<string> {
        return (
            await this.S3Service.getPublicFile(
                `/letters/${language}/${fileName}`,
            )
        ).toString();
    }
}
