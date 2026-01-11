import * as process from 'process';

export const isProd = () => {
    return process.env.NODE_ENV == 'PROD';
};
