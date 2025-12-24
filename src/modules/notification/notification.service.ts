import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { Languages } from '../language/enums/languages.enums';
import { ConfigService } from '@nestjs/config';
import { isProd } from '../../common/utils/isProd';
import { GmailService } from '../gmail/gmail.service';
import {
    CREATE_CLAIM_FILENAME,
    DOCUMENT_REQUEST_FILENAME,
    FINISH_CLAIM_FILENAME,
    FORGOT_PASSWORD_CODE_FILENAME,
    GENERATE_NEW_ACCOUNT_FILENAME,
    MISSING_DOCUMENTS_FILENAME,
    NEW_STATUS_FILENAME,
    REGISTER_CODE_FILENAME,
    REMINDER_CLAIM_RECEIVED_FILENAME,
    REMINDER_LEGAL_PROCESS_FILENAME,
    REMINDER_SENT_TO_AIRLINE_FILENAME,
    REQUEST_PAYMENT_DETAILS_FILENAME,
    SEND_PARTNER_PAYOUT_FILENAME,
    SPECIALIZED_DOCUMENT_REQUEST_PASSPORT_IMAGE_UNCLEAR_FILENAME,
    SPECIALIZED_DOCUMENT_REQUEST_PASSPORT_MISMATCH_FILENAME,
    SPECIALIZED_DOCUMENT_REQUEST_SIGNATURE_MISMATCH_FILENAME,
} from './constants';
import { LETTERS_DIRECTORY_PATH } from '../../common/constants/paths/LettersDirectoryPath';
import { EmailCategory } from '../gmail/enums/email-type.enum';
import { TokenService } from '../token/token.service';
import { UnsubscribeJwt } from '../unsubscribe-email/interfaces/unsubscribe-jwt';
import { UnsubscribeEmailService } from '../unsubscribe-email/unsubscribe-email.service';
import { gmail_v1 } from 'googleapis';
import { DocumentRequestReason, DocumentType } from '@prisma/client';
import Handlebars from 'handlebars';
import { ReminderTypeEnum } from './enums/reminder-type.enum';
import { GenerateLinksService } from '../generate-links/generate-links.service';

@Injectable()
export class NotificationService {
    constructor(
        private readonly configService: ConfigService,
        private readonly gmailService: GmailService,
        private readonly tokenService: TokenService,
        private readonly unsubscribeEmailService: UnsubscribeEmailService,
        private readonly generateLinksService: GenerateLinksService,
    ) {}

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
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const letterContentHtml = (
            await this.getLetterContentTemplate(
                GENERATE_NEW_ACCOUNT_FILENAME,
                language,
            )
        )
            .replace('{{email}}', userData.email)
            .replace('{{password}}', userData.password)
            .replace(
                '{{resetPasswordLink}}',
                `${this.configService.getOrThrow('FRONTEND_URL')}/forgot`,
            );

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        await this.gmailService.noreply.sendEmailHtml(
            to,
            'Your SkyHelp account details',
            letterHtml,
            emailCategory,
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
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
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

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Your claim successfully submitted #${claimData.id}`;
        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: claimData.id,
            contentHtml: letterHtml,
            to,
        });
    }

    async sendNewStatus(
        to: string,
        newStatusData: {
            title: string;
            description: string;
            clientName: string;
            claimId: string;
            comments: string | null;
        },
        language: Languages = Languages.EN,
    ) {
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
            NEW_STATUS_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml
            .replace('{{clientName}}', newStatusData.clientName)
            .replace('{{claimId}}', newStatusData.claimId)
            .replace('{{currentStep.title}}', newStatusData.title)
            .replace('{{currentStep.description}}', newStatusData.description)
            .replace(
                '{{claimLink}}',
                `https://${this.configService.getOrThrow('DOMAIN')}/dashboard`,
            )
            .replace(
                '{{comments}}',
                newStatusData.comments
                    ? `  
  <div style="margin-top: 20px; padding: 16px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
    <div style="font-size: 15px; color: #374151; line-height: 1.5; min-height: 1em;">
      ${newStatusData.comments}
    </div>
  </div> `
                    : '',
            );

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Update on your claim #${newStatusData.claimId}`;
        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: newStatusData.claimId,
            contentHtml: letterHtml,
            to,
        });
    }

    async sendDocumentRequest(
        to: string,
        letterData: {
            documentRequestsData: {
                documentType: DocumentType;
                client: string;
            }[];
            customerName: string;
            claimId: string;
        },
        language: Languages = Languages.EN,
    ) {
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtmlRaw = await this.getLetterContentTemplate(
            DOCUMENT_REQUEST_FILENAME,
            language,
        );

        Handlebars.registerHelper('eq', (a: string, b: string) => a === b);

        const template = Handlebars.compile(letterTemplateHtmlRaw);

        const letterHtmlContent = template({
            customerName: letterData.customerName,
            claimId: letterData.claimId,
            dashboardLink: `${this.configService.getOrThrow('FRONTEND_URL')}/dashboard`,
            documentRequestsData: letterData.documentRequestsData,
        });

        const letterHtml = this.setContentInLayout(
            letterHtmlContent,
            layoutHtml,
        );

        const subject = `Action required: upload missing documents for claim #${letterData.claimId}`;

        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: letterData.claimId,
            contentHtml: letterHtml,
            to,
        });
    }

    async sendMissingDocumentEmail(
        to: string,
        letterData: {
            customerName: string;
            claimId: string;
        },
        language: Languages = Languages.EN,
    ) {
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
            MISSING_DOCUMENTS_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml
            .replace('{{customerName}}', letterData.customerName)
            .replace(
                '{{dashboardLink}}',
                `https://${this.configService.getOrThrow('DOMAIN')}/dashboard`,
            );

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Missing documents for your claim #${letterData.claimId}`;

        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: letterData.claimId,
            contentHtml: letterHtml,
            to,
        });
    }

    async sendForgotPasswordCode(
        to: string,
        letterData: {
            customerName: string;
            resetCode: string;
        },
    ) {
        !isProd() &&
            console.log(
                `Seng forgot password code ${letterData.resetCode} on ${to}`,
            );
        const language = Languages.EN;
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
            FORGOT_PASSWORD_CODE_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml
            .replace('{{customerName}}', letterData.customerName)
            .replace('{{resetCode}}', letterData.resetCode);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Verification code for your account`;

        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            contentHtml: letterHtml,
            to,
        });
    }

    async sendRegisterCode(
        to: string,
        letterData: {
            customerName: string;
            registerCode: string;
        },
    ) {
        !isProd() &&
            console.log(
                `Seng register code ${letterData.registerCode} on ${to}`,
            );
        const language = Languages.EN;
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
            REGISTER_CODE_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml
            .replace('{{customerName}}', letterData.customerName)
            .replace('{{verificationCode}}', letterData.registerCode);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Verification code for your account`;

        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            contentHtml: letterHtml,
            to,
        });
    }

    async sendPartnerPayout(
        to: string,
        letterData: {
            amount: number;
        },
        language: Languages = Languages.EN,
    ) {
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
            SEND_PARTNER_PAYOUT_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml.replace(
            '{{amount}}',
            letterData.amount.toString(),
        );

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Your Payout Has Been Processed`;

        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            contentHtml: letterHtml,
            to,
        });
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

        if (await this.isUnsubscribed(to)) {
            return;
        }

        const emailCategory = EmailCategory.MARKETING;

        const letterTemplateHtml = await this.getLetterContentTemplate(
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

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Just one step away from your compensation #${claimData.id}`;
        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: claimData.id,
            contentHtml: letterHtml,
            to,
        });
    }

    private async getLetterContentTemplate(
        fileName: string,
        language: Languages = Languages.EN,
    ): Promise<string> {
        return (
            await fs.readFile(
                path.join(LETTERS_DIRECTORY_PATH, `${language}/${fileName}`),
            )
        ).toString();
    }

    async sendPaymentRequest(
        to: string,
        letterData: {
            customerName: string;
            paymentDetailsLink: string;
            claimId: string;
        },
        language: Languages = Languages.EN,
    ) {
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
            REQUEST_PAYMENT_DETAILS_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml
            .replace('{{customerName}}', letterData.customerName)
            .replace('{{paymentDetailsLink}}', letterData.paymentDetailsLink);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Action Required: Payment Details Needed #${letterData.claimId}`;
        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: letterData.claimId,
            contentHtml: letterHtml,
            to,
        });
    }

    async sendClaimReminder(
        to: string,
        letterData: {
            customerName: string;
            claimId: string;
            reminderType: ReminderTypeEnum;
        },
        language: Languages = Languages.EN,
    ) {
        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        const letterTemplateHtml = await this.getLetterContentTemplate(
            letterData.reminderType == ReminderTypeEnum.CLAIM_RECEIVED
                ? REMINDER_CLAIM_RECEIVED_FILENAME
                : letterData.reminderType == ReminderTypeEnum.SENT_TO_AIRLINE
                  ? REMINDER_SENT_TO_AIRLINE_FILENAME
                  : REMINDER_LEGAL_PROCESS_FILENAME,
            language,
        );

        const letterContentHtml = letterTemplateHtml.replace(
            '{{clientName}}',
            letterData.customerName,
        );

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const subject = `Current Progress on Your Claim #${letterData.claimId}`;
        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: letterData.claimId,
            contentHtml: letterHtml,
            to,
        });
    }

    async sendSpecializedDocumentRequest(
        to: string,
        letterData: {
            customerName: string;
            claimId: string;
            documentRequestReason: DocumentRequestReason;
            passengerId: string;
            passengerName: string;
            isCustomer: boolean;
        },
        language: Languages = Languages.EN,
    ) {
        const {
            documentRequestReason,
            claimId,
            customerName,
            passengerId,
            passengerName,
            isCustomer,
        } = letterData;
        if (documentRequestReason == DocumentRequestReason.MISSING_DOCUMENT) {
            return;
        }

        const emailCategory = EmailCategory.TRANSACTIONAL;

        const layoutHtml = await this.getLayout(to, language, emailCategory);

        let letterTemplateFileName: string;
        let subject: string;
        let link: string;
        const jwt = await this.generateLinksService.generateLinkJwt(claimId);
        switch (documentRequestReason) {
            case DocumentRequestReason.PASSPORT_IMAGE_UNCLEAR:
                subject = `Passport image unclear - resubmission required #${claimId}`;
                letterTemplateFileName =
                    SPECIALIZED_DOCUMENT_REQUEST_PASSPORT_IMAGE_UNCLEAR_FILENAME;
                link = await this.generateLinksService.generateUploadDocuments(
                    passengerId,
                    claimId,
                    jwt,
                    JSON.stringify({
                        documentTypes: [DocumentType.PASSPORT],
                    }),
                    passengerName,
                );
                break;
            case DocumentRequestReason.PASSPORT_MISMATCH:
                subject = `Passport data mismatch #${claimId}`;
                letterTemplateFileName =
                    SPECIALIZED_DOCUMENT_REQUEST_PASSPORT_MISMATCH_FILENAME;
                link = await this.generateLinksService.generateUploadDocuments(
                    passengerId,
                    claimId,
                    jwt,
                    JSON.stringify({
                        documentTypes: [DocumentType.PASSPORT],
                    }),
                    passengerName,
                );
                break;
            case DocumentRequestReason.SIGNATURE_MISMATCH:
                subject = `Signature mismatch in submitted documents #${claimId}`;
                letterTemplateFileName =
                    SPECIALIZED_DOCUMENT_REQUEST_SIGNATURE_MISMATCH_FILENAME;
                if (isCustomer) {
                    link = await this.generateLinksService.generateSignCustomer(
                        passengerId,
                        claimId,
                        jwt,
                    );
                } else {
                    link =
                        await this.generateLinksService.generateSignOtherPassenger(
                            passengerId,
                            jwt,
                            false,
                        );
                }

                break;
        }

        const letterTemplateHtml = await this.getLetterContentTemplate(
            letterTemplateFileName,
            language,
        );

        const letterContentHtml = letterTemplateHtml
            .replace('{{customerName}}', customerName)
            .replace('{{link}}', link);

        const letterHtml = this.setContentInLayout(
            letterContentHtml,
            layoutHtml,
        );

        const email = await this.gmailService.noreply.sendEmailHtml(
            to,
            subject,
            letterHtml,
            emailCategory,
        );

        await this.saveHtmlEmail({
            email,
            subject,
            claimId: letterData.claimId,
            contentHtml: letterHtml,
            to,
        });
    }

    private async getLayout(
        to: string,
        language: Languages = Languages.EN,
        emailCategory: EmailCategory = EmailCategory.TRANSACTIONAL,
    ): Promise<string> {
        const layout = (
            await fs.readFile(
                path.join(
                    LETTERS_DIRECTORY_PATH,
                    `layout/${emailCategory == EmailCategory.MARKETING ? '/unsubscribe/' : ''}${language}.html`,
                ),
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
}
