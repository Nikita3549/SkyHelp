export interface IFlightIoFlightStatus {
    departure: {
        offGroundTime?: string | null;
        outGateTime?: string | null;
        gate?: string | null;
        departureDateTime: string;
        duration: string;
        airport: string;
        airportCity: string;
        airportCode: string;
        airportCountryCode: string;
        airportSlug: string;
        scheduledTime: string;
        estimatedTime?: string | null;
        terminal?: string | null;
    };

    arrival: {
        timeRemaining?: string | null;
        onGroundTime?: string | null;
        inGateTime?: string | null;
        gate?: string | null;
        baggage?: string | null;
        arrivalDateTime: string;
        airport: string;
        airportCity: string;
        airportCode: string;
        airportCountryCode: string;
        airportSlug: string;
        scheduledTime: string;
        estimatedTime?: string | null;
        terminal?: string | null;
    };

    aircraft?: {
        id: number;
        code: string;
        name: string;
    };

    status:
        | 'Scheduled'
        | 'Boarding'
        | 'In Flight'
        | 'Arrived'
        | 'Delayed'
        | 'Cancelled'
        | string;
}

export type FlightIoFlightStatus = Array<
    | { departure: IFlightIoFlightStatus['departure'] }
    | { arrival: IFlightIoFlightStatus['arrival'] }
    | { aircraft: IFlightIoFlightStatus['aircraft'] }
    | { status: IFlightIoFlightStatus['status'] }
>;
