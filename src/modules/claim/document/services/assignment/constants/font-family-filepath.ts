import * as path from 'path';
import { FontsDirectoryPath } from '../../../../../../common/constants/paths/FontsDirectoryPath';

export const FONT_FAMILY_FILEPATH = {
    INTER: {
        REGULAR: path.resolve(FontsDirectoryPath, 'Inter', 'regular.ttf'),
        MEDIUM: path.resolve(FontsDirectoryPath, 'Inter', 'medium.ttf'),
        BOLD: path.resolve(FontsDirectoryPath, 'Inter', 'bold.ttf'),
    },
} as const;
