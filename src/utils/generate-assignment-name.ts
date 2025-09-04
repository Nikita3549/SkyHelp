import { formatDate } from './formatDate';

export function generateAssignmentName(
    firstName: string,
    lastName: string,
): string {
    return `${firstName}_${lastName}-${formatDate(new Date(), 'dd.mm.yyyy')}-assignment_agreement.pdf`;
}
