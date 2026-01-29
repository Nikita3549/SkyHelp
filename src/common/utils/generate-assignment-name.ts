import { formatDate } from './formatDate';

export function generateAssignmentName(
    firstName: string,
    lastName: string,
    signedDate: Date,
): string {
    return `${firstName}_${lastName}-${formatDate(signedDate, 'dd.mm.yyyy')}-assignment_agreement.pdf`;
}
