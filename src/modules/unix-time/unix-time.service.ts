import { Injectable } from '@nestjs/common';

@Injectable()
export class UnixTimeService {
    toDate(unix: number | string): Date {
        return new Date(Number(unix));
    }
}
