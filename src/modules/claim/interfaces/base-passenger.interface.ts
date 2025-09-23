export interface BasePassenger {
    id: string;
    firstName: string;
    lastName: string;
    city: string;
    country?: string | null;
    address: string;
    email?: string | null;
    isSigned: boolean;
}
