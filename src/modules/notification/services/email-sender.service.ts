import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GmailService } from '../../gmail/gmail.service';
import { TokenService } from '../../token/token.service';
import { UnsubscribeEmailService } from '../../unsubscribe-email/unsubscribe-email.service';
import { GenerateLinksService } from '../../generate-links/generate-links.service';
import { S3Service } from '../../s3/s3.service';
import { Languages } from '../../language/enums/languages.enums';
import { EmailCategory } from '../../gmail/enums/email-type.enum';
import { UnsubscribeJwt } from '../../unsubscribe-email/interfaces/unsubscribe-jwt';
import { gmail_v1 } from 'googleapis';
import * as handlebars from 'handlebars';
import { SUPPORTED_LETTER_LANGUAGES } from '../constants/supported-languages';
import { ILetterData } from '../interfaces/letter-data.interface';
import { IProcessAndSendOptions } from '../interfaces/process-and-send-options.interface';

@Injectable()
export class EmailSenderService {
    constructor(
        private readonly configService: ConfigService,
        private readonly gmailService: GmailService,
        private readonly tokenService: TokenService,
        private readonly unsubscribeEmailService: UnsubscribeEmailService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly S3Service: S3Service,
    ) {}
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

        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        if (options?.doNotSaveInDb) {
            return;
        }

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: claimId,
            contentHtml: letterHtml,
            to,
        });
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
                `/letters/layout/${emailCategory == EmailCategory.MARKETING ? '/unsubscribe/' : ''}${language}.html`,
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

    private async isUnsubscribed(email: string): Promise<boolean> {
        return !!(await this.unsubscribeEmailService.getUnsubscribeEmail(
            email,
        ));
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
            await this.gmailService.email.saveEmail({
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
