import { DAY } from '../../../common/constants/time.constants';

export const CLAIM_NOT_FOUND = 'Claim not found';

export const HAVE_NO_RIGHTS_ON_CLAIM =
    'You dont have rights to get info about this claim';

export const INVALID_JWT = 'Invalid jwt';

export const DOCUMENT_NOT_FOUND = 'Document not found';

export const PAYMENT_DETAILS_ALREADY_REQUESTED =
    'Payment details already requested for this claim';

export const FILE_DOESNT_ON_DISK = 'File does not exist on disk';

export const INVALID_ICAO = 'Invalid ICAO code';

export const PASSENGER_NOT_FOUND = 'Passenger not found';

export const CUSTOMER_NOT_FOUND = 'Customer not found';

export const CLAIM_FOLLOWUP_QUEUE_KEY = 'claims';
export const CLAIM_REMINDER_QUEUE_KEY = 'claims-reminder';
export const CLAIM_REMINDER_INTERVAL = DAY * 14;
export const ADD_FLIGHT_STATUS_QUEUE_KEY = 'add-flight-status';
export const REQUEST_PAYMENT_DETAILS_QUEUE_KEY = 'request-payment-details';

export const TWO_DAYS = 2 * DAY;
export const THREE_DAYS = 3 * DAY;
export const FOUR_DAYS = 4 * DAY;
export const FIVE_DAYS = 5 * DAY;
export const SIX_DAYS = 6 * DAY;

export const PAYMENT_STEP = 8;
export const FINAL_STEP = 9;

export const CONTINUE_LINKS_EXP = '30days';

export const MEGABYTE = 1024 * 1024;

export const INVALID_BOARDING_PASS = 'Invalid boarding pass';
