import { Languages } from '../modules/language/enums/languages.enums';

export function isLanguage(language: unknown): language is Languages {
    return (
        !!language && Object.values(Languages).includes(language as Languages)
    );
}
