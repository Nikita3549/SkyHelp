export interface IGetSignUrlRequest {
    returnUrl: string;
    authenticationMethod: string;
    email: string;
    userName: string;
    recipientId: string;
    clientUserId: string;
}
