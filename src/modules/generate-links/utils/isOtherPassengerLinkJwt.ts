import { IOtherPassengerLinkJwt } from '../interfaces/other-passenger-link-jwt.interface';

export function isOtherPassengerLinkJwt(
    jwt: unknown,
): jwt is IOtherPassengerLinkJwt {
    return (
        typeof jwt == 'object' &&
        jwt != null &&
        typeof (jwt as any).otherPassengerId == 'string' &&
        typeof (jwt as any).claimId == 'string'
    );
}
