export interface ICreateEnvelopeResponse {
    envelopeId: string;
    uri: string;
    statusDateTime: string;
    status: string | 'created';
}
