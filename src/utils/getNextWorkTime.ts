import {
    WORK_END_HOUR,
    WORK_START_HOUR,
} from '../common/constants/time.constants';
import { isProd } from './isProd';

export function getNextWorkTime(delay: number): number {
    if (!isProd()) return delay;
    const now = Date.now();
    const target = new Date(now + delay);

    if (target.getHours() < WORK_START_HOUR) {
        target.setHours(WORK_START_HOUR, 0, 0, 0);
    } else if (target.getHours() > WORK_END_HOUR) {
        target.setDate(target.getDate() + 1);
        target.setHours(WORK_START_HOUR, 0, 0, 0);
    }

    return target.getTime() - now;
}
