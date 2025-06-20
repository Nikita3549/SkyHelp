export interface IWebhookRequest {
    event: string;
    uri: string;
    retryCount: string;
    configurationId: string;
    apiVersion: string;
    generatedDateTime: string;
    data: {
        accountId: string;
        recipientId: string;
        envelopeId: string;
        envelopeSummary: {
            status: string;
            emailSubject: string;
            emailBlurb: string;
            signingLocation: string;
            enableWetSign: string;
            allowMarkup: string;
            allowReassign: string;
            createdDateTime: string;
            lastModifiedDateTime: string;
            statusChangedDateTime: string;
            useDisclosure: string;
            sender: {
                userName: string;
                userId: string;
                accountId: string;
                email: string;
            };
            recipients: any; // если нужна точная структура — уточни
            envelopeDocuments: {
                documentId: string;
                documentIdGuid: string;
                name: string;
                type: string;
                order: string;
                display: string;
                includeInDownload: string;
                signerMustAcknowledge: string;
                templateRequired: string;
                authoritative: string;
                PDFBytes: string;
            }[];
        };
    };
}
