import { BoardingPassApiResponse } from './boarding-pass-api.response';

export interface IBoardingPassApiScanResponse {
    clientId: string;
    status: 'success' | 'searching';
    data: BoardingPassApiResponse[];
}
