import { CompensationAmount } from '../dto/generate-template.dto';

export const PRELIT_TEMPLATES_FILENAMES = {
    CANCELLATION: {
        [CompensationAmount.TWO_HUNDRED_AND_HALF]:
            'cancellation/flyone_ro_250.pdf',
        [CompensationAmount.FOUR_HUNDRED]: 'cancellation/flyone_ro_400.pdf',
        [CompensationAmount.SIX_HUNDRED]: 'cancellation/flyone_ro_600.pdf',
    },
    DELAY: {
        [CompensationAmount.TWO_HUNDRED_AND_HALF]: 'delay/flyone_ro_250.pdf',
        [CompensationAmount.FOUR_HUNDRED]: 'delay/flyone_ro_400.pdf',
        [CompensationAmount.SIX_HUNDRED]: 'delay/flyone_ro_600.pdf',
    },
    OVERBOOKING: {
        [CompensationAmount.TWO_HUNDRED_AND_HALF]:
            'overbooking/flyone_ro_250.pdf',
        [CompensationAmount.FOUR_HUNDRED]: 'overbooking/flyone_ro_400.pdf',
        [CompensationAmount.SIX_HUNDRED]: 'overbooking/flyone_ro_600.pdf',
    },
} as const;
