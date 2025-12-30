import { OauthAccount, User } from '@prisma/client';

export interface IUserWithOauthAccounts extends User {
    oauthAccounts: OauthAccount[];
}
