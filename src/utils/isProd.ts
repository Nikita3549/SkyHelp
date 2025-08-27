import * as process from 'process';

export const isProd = () => {
    return true;
    return process.env.NODE_ENV == 'PROD';
};
