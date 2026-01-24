import { FlightIoFlightStatus } from '../interfaces/flight-io/flight-io-flight-status';
import { IFlightStatus } from '../interfaces/flight-status.interface';

export function parseFlightIoFlightStatus(
    flightData: FlightIoFlightStatus,
): Omit<IFlightStatus, 'source'> {
    const departure = flightData.find(
        (item): item is { departure: any } => 'departure' in item,
    )?.departure;
    const arrival = flightData.find(
        (item): item is { arrival: any } => 'arrival' in item,
    )?.arrival;
    const statusItem = flightData.find(
        (item): item is { status: any } => 'status' in item,
    );
    const status = statusItem?.status as string | undefined;

    if (status === 'Cancelled') {
        return {
            isCancelled: true,
            delayMinutes: 0,
            exactTime: new Date(departure.departureDateTime),
        };
    }

    if (status !== 'Arrived' || !arrival) {
        return {
            isCancelled: false,
            delayMinutes: 0,
            exactTime: new Date(departure.departureDateTime),
        };
    }

    const { scheduledTime, inGateTime, arrivalDateTime } = arrival;

    const months: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
    };

    const parseTextTime = (
        value?: string | null,
        year?: number,
    ): Date | null => {
        if (!value || !year) return null;

        const [timePart, datePart] = value.split(', ');
        if (!timePart || !datePart) return null;

        const [hours, minutes] = timePart.split(':').map(Number);
        const [monthStr, dayStr] = datePart.split(' ');

        const month = months[monthStr];
        if (month === undefined) return null;

        return new Date(year, month, Number(dayStr), hours, minutes);
    };

    const yearFromIso = arrivalDateTime
        ? new Date(arrivalDateTime).getFullYear()
        : undefined;

    const scheduled = parseTextTime(scheduledTime, yearFromIso);

    const actual =
        parseTextTime(inGateTime, yearFromIso) ??
        (arrivalDateTime ? new Date(arrivalDateTime) : null);

    if (!scheduled || !actual) {
        return {
            isCancelled: false,
            delayMinutes: 0,
            exactTime: new Date(departure.departureDateTime),
        };
    }

    const delayMinutes = Math.max(
        0,
        Math.round((actual.getTime() - scheduled.getTime()) / 60000),
    );

    return {
        isCancelled: false,
        delayMinutes,
        exactTime: new Date(departure.departureDateTime),
    };
}
