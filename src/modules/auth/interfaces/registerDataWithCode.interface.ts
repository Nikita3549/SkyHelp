import { ISaveUserData } from '../../user/interfaces/saveUserData.interface';

export interface IRegisterDataWithCode {
    code: number;
    registerData: ISaveUserData;
}
