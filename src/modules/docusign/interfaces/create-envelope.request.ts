export interface ICreateEnvelopeRequest {
    templateId: string;
    status: string;
    templateRoles: {
        roleName: string;
        name: string;
        email: string;
        clientUserId: string;
        tabs: {
            textTabs: {
                tabLabel: string;
                value: string;
            }[];
        };
    }[];
}
