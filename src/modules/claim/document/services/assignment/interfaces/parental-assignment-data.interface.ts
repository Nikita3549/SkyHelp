import { IAssignmentData } from './assignment-data.interface';

export interface IParentalAssignmentData extends IAssignmentData {
    parentFirstName: string;
    parentLastName: string;
    minorBirthday: Date;
}
