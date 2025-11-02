import { MINUTE } from '../../../../common/constants/time.constants';
import { isProd } from '../../../../utils/isProd';

export const PROGRESS_NOT_FOUND = 'Progress not found';

export const SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY =
    'send-new-progress-email-queue';

export const SEND_NEW_PROGRESS_EMAIL_QUEUE_DELAY = isProd() ? 5 * MINUTE : 0;
