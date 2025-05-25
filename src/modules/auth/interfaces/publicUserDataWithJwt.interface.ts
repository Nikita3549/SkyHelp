import { IPublicUserData } from '../../user/interfaces/publicUserData.interface';

export interface IPublicUserDataWithJwt {
    userData: IPublicUserData;
    jwt: string;
}
