export const ALREADY_REGISTERED_ERROR = 'User with this email already exists';

export const CONFIRM_REGISTRATION_SUCCESS =
    'Code was sent on email. Continue registration';

export const REGISTER_DATA_TTL = 900;

export const FORGOT_PASSWORD_CODE_TTL = 1800;

export const EXPIRE_CODE_OR_WRONG_EMAIL_ERROR =
    'Email is wrong or code is expired. Please, restart registration';

export const WRONG_CODE_ERROR = 'Code is wrong';

export const CODE_SUCCESSFUL_RESEND = 'Code was resend';

export const WRONG_EMAIL_OR_PASSWORD = 'Email or password is wrong';

export const SEND_FORGOT_PASSWORD_CODE_SUCCESS =
    'Code was successful sent on email. Continue reset';

export const REDIS_REGISTER_DATA_KEY_POSTFIX = 'register-data';

export const REDIS_RESET_PASSWORD_CODE_KEY_POSTFIX = 'reset_password-code';

export const WRONG_EMAIL = "This email isn't registered";

export const CODE_IS_WRONG_OR_EXPIRED = 'Code is wrong or expired';

export const CORRECT_CODE = 'Code is correct';

export const PASSWORD_WAS_CHANGED_SUCCESS = 'Password was changed successful';

export const DEFAULT_GENERATED_PASSWORD_LENGTH = 16;
