import * as path from 'path';
import { AssignmentsDirectoryPath } from '../../../../../../common/constants/paths/AssignmentsDirectoryPath';

export const ASSIGNMENT_AGREEMENT_FILEPATH = {
    REGULAR: path.join(
        AssignmentsDirectoryPath,
        'assignment_agreement-template.pdf',
    ),
    PARENTAL: path.join(
        AssignmentsDirectoryPath,
        'parental-assignment_agreement-template.pdf',
    ),
} as const;
