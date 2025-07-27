import { Injectable } from '@nestjs/common';

@Injectable()
export class UnixTimeService {
    toUnix(date: Date | string | number): number {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return Math.floor(date.getTime() / 1000);
    }

    toDate(unixTimestamp: number): Date {
        return new Date(unixTimestamp * 1000);
    }
}
