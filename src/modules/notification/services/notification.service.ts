import { Injectable } from '@nestjs/common';
import { Languages } from '../../language/enums/languages.enums';
import { ConfigService } from '@nestjs/config';
import { isProd } from '../../../common/utils/isProd';
import { GmailService } from '../../gmail/gmail.service';
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
} from '../constants';
import { EmailCategory } from '../../gmail/enums/email-type.enum';
import { UnsubscribeEmailService } from '../../unsubscribe-email/unsubscribe-email.service';
import { DocumentRequestReason, DocumentType } from '@prisma/client';
import { ReminderTypeEnum } from '../enums/reminder-type.enum';
import { GenerateLinksService } from '../../generate-links/generate-links.service';
import { EmailSenderService } from './email-sender.service';

@Injectable()
export class NotificationService {
    dashboardLink: string;
    resetPasswordLink: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly gmailService: GmailService,
        private readonly unsubscribeEmailService: UnsubscribeEmailService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly emailSenderService: EmailSenderService,
    ) {
        this.dashboardLink = `${this.configService.getOrThrow('FRONTEND_URL')}/dashboard`;
        this.resetPasswordLink = `${this.configService.getOrThrow('FRONTEND_URL')}/forgot`;
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
        await this.emailSenderService.processAndSend(
            {
                to,
                subject: 'Your SkyHelp account details',
                language,
                emailCategory: EmailCategory.TRANSACTIONAL,
                templateFilename: GENERATE_NEW_ACCOUNT_FILENAME,
                context: {
                    email: userData.email,
                    password: userData.password,
                    resetPasswordLink: this.resetPasswordLink,
                },
            },
            { doNotSaveInDb: true },
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
        },
        language: Languages = Languages.EN,
    ) {
        await this.emailSenderService.processAndSend({
            to,
            subject: `Your claim successfully submitted #${claimData.id}`,
            language,
            claimId: claimData.id,
            emailCategory: EmailCategory.TRANSACTIONAL,
            templateFilename: CREATE_CLAIM_FILENAME,
            context: {
                claimId: claimData.id,
                airlineName: claimData.airlineName,
                claimLink: this.dashboardLink,
            },
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
        await this.emailSenderService.processAndSend({
            to,
            subject: `Update on your claim #${newStatusData.claimId}`,
            language,
            claimId: newStatusData.claimId,
            emailCategory: EmailCategory.TRANSACTIONAL,
            templateFilename: NEW_STATUS_FILENAME,
            context: {
                clientName: newStatusData.clientName,
                claimId: newStatusData.claimId,
                currentStepTitle: newStatusData.title,
                currentStepDescription: newStatusData.description,
                claimLink: this.dashboardLink,
                comments: newStatusData.comments ?? '',
            },
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
        await this.emailSenderService.processAndSend({
            to,
            subject: `Action required: upload missing documents for claim #${letterData.claimId}`,
            language,
            claimId: letterData.claimId,
            emailCategory: EmailCategory.TRANSACTIONAL,
            templateFilename: DOCUMENT_REQUEST_FILENAME,
            context: {
                customerName: letterData.customerName,
                claimId: letterData.claimId,
                dashboardLink: this.dashboardLink,
                documentRequestsData: letterData.documentRequestsData,
            },
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
        await this.emailSenderService.processAndSend({
            to,
            subject: `Missing documents for your claim #${letterData.claimId}`,
            language,
            claimId: letterData.claimId,
            emailCategory: EmailCategory.TRANSACTIONAL,
            templateFilename: MISSING_DOCUMENTS_FILENAME,
            context: {
                customerName: letterData.customerName,
                dashboardLink: this.dashboardLink,
            },
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
        await this.emailSenderService.processAndSend(
            {
                to,
                subject: `Verification code for your account`,
                language: Languages.EN,
                emailCategory: EmailCategory.TRANSACTIONAL,
                templateFilename: FORGOT_PASSWORD_CODE_FILENAME,
                context: {
                    customerName: letterData.customerName,
                    resetCode: letterData.resetCode,
                },
            },
            { doNotSaveInDb: true },
        );
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
        await this.emailSenderService.processAndSend(
            {
                to,
                subject: `Verification code for your account`,
                language: Languages.EN,
                emailCategory: EmailCategory.TRANSACTIONAL,
                templateFilename: REGISTER_CODE_FILENAME,
                context: {
                    customerName: letterData.customerName,
                    verificationCode: letterData.registerCode,
                },
            },
            { doNotSaveInDb: true },
        );
    }

    async sendPartnerPayout(
        to: string,
        letterData: {
            amount: number;
        },
        language: Languages = Languages.EN,
    ) {
        await this.emailSenderService.processAndSend({
            to,
            subject: `Your Payout Has Been Processed`,
            language,
            emailCategory: EmailCategory.TRANSACTIONAL,
            templateFilename: SEND_PARTNER_PAYOUT_FILENAME,
            context: {
                amount: letterData.amount,
            },
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

        await this.emailSenderService.processAndSend({
            to,
            subject: `Just one step away from your compensation #${claimData.id}`,
            language,
            claimId: claimData.id,
            emailCategory: EmailCategory.MARKETING,
            templateFilename: FINISH_CLAIM_FILENAME,
            context: {
                clientName: claimData.clientFirstName,
                compensation: claimData.compensation,
                claimId: claimData.id,
                claimLink: claimData.continueClaimLink,
            },
        });
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
        await this.emailSenderService.processAndSend({
            to,
            subject: `Action Required: Payment Details Needed #${letterData.claimId}`,
            language,
            claimId: letterData.claimId,
            emailCategory: EmailCategory.TRANSACTIONAL,
            templateFilename: REQUEST_PAYMENT_DETAILS_FILENAME,
            context: {
                customerName: letterData.customerName,
                paymentDetailsLink: letterData.paymentDetailsLink,
            },
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
        let templateFilename: string = REMINDER_CLAIM_RECEIVED_FILENAME;
        if (letterData.reminderType == ReminderTypeEnum.SENT_TO_AIRLINE) {
            templateFilename = REMINDER_SENT_TO_AIRLINE_FILENAME;
        }
        if (letterData.reminderType == ReminderTypeEnum.LEGAL_PROCESS) {
            templateFilename = REMINDER_LEGAL_PROCESS_FILENAME;
        }

        await this.emailSenderService.processAndSend({
            to,
            subject: `Current Progress on Your Claim #${letterData.claimId}`,
            language,
            claimId: letterData.claimId,
            emailCategory: EmailCategory.TRANSACTIONAL,
            templateFilename,
            context: {
                clientName: letterData.customerName,
            },
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
        let templateFilename: string;
        let subject: string;
        let link: string;
        const jwt = await this.generateLinksService.generateLinkJwt(claimId);
        switch (documentRequestReason) {
            case DocumentRequestReason.PASSPORT_IMAGE_UNCLEAR:
                subject = `Passport image unclear - resubmission required #${claimId}`;
                templateFilename =
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
                templateFilename =
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
                templateFilename =
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

        await this.emailSenderService.processAndSend({
            to,
            subject,
            language,
            claimId,
            emailCategory: EmailCategory.TRANSACTIONAL,
            templateFilename,
            context: {
                customerName,
                link,
            },
        });
    }

    private async isUnsubscribed(email: string): Promise<boolean> {
        return !!(await this.unsubscribeEmailService.getUnsubscribeEmail(
            email,
        ));
    }
}
