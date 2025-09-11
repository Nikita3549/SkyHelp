import { IClaimJwt } from '../modules/claim/interfaces/claim-jwt.interface';
import { UnauthorizedException } from '@nestjs/common';
import { INVALID_JWT } from '../modules/claim/constants';
import { JwtPayload } from 'jsonwebtoken';

export const validateClaimJwt = async (
    jwt: string,
    expectedClaimId: string,
    verify: <I extends JwtPayload | string>(jwt: string) => Promise<I>,
) => {
    try {
        const token = await verify<IClaimJwt>(jwt);

        if (token.claimId != expectedClaimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        return token;
    } catch (e: unknown) {
        throw new UnauthorizedException(INVALID_JWT);
    }
};
