export interface IUserInfoResponse {
    sub: string;
    name: string;
    given_name: string;
    family_name: string;
    email: string;
    accounts: {
        account_id: string;
        is_default: boolean;
        account_name: string;
        base_uri: string;
    }[];
}
