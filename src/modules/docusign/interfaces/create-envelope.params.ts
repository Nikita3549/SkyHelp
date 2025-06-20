export interface ICreateEnvelopeParams {
    claimId: string;
    customerName: string;
    customerEmail: string;
    labels: {
        assignmentDate: string;
        clientAddress: string;
        flightAirline: string;
        flightNumber: string;
        flightDate: string;
    };
}
