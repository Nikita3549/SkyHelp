export const LETTERS_FILENAMES = {
    CLAIM: {
        CREATE_CLAIM: 'createClaim.html',
        FINISH_CLAIM: 'finishClaim.html',
        NEW_STATUS: 'newStatus.html',
        SENT_TO_AIRLINE: 'sentToAirline.html',
        DOCUMENT_REQUEST: 'documentRequests.html',
        REQUEST_PAYMENT_DETAILS: 'requestPaymentDetails.html',
        REMINDERS: {
            CLAIM_RECEIVED: 'reminders/claimReceived.html',
            LEGAL_PROCESS: 'reminders/legalProcess.html',
            SENT_TO_AIRLINE: 'reminders/sentToAirline.html',
        },
        SPECIALIZED_DOC_REQUESTS: {
            PASSPORT_MISMATCH:
                'specializedDocumentRequests/passportDataMismatch.html',
            PASSPORT_IMAGE_UNCLEAR:
                'specializedDocumentRequests/passportImageUnclear.html',
            SIGNATURE_MISMATCH:
                'specializedDocumentRequests/signatureMismatch.html',
        },
    },
    AUTH: {
        NEW_GENERATED_ACCOUNT: 'generateNewAccount.html',
        REGISTER_CODE: 'registerCode.html',
        RESET_PASSWORD_CODE: 'recoverPassword.html',
    },
    PARTNER: {
        PAYOUT_PROCESSED: 'sendPartnerPayout.html',
    },
} as const;
