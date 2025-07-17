import { IClaimJwt } from '../interfaces/claim-jwt.interface';
import { UnauthorizedException } from '@nestjs/common';
import { INVALID_JWT } from '../constants';
import { JwtPayload } from 'jsonwebtoken';

export const validateClaimJwt = (
    jwt: string,
    expectedClaimId: string,
    verify: <I extends JwtPayload | string>(jwt: string) => I,
) => {
    const { claimId } = verify<IClaimJwt>(jwt);

    if (claimId != expectedClaimId) {
        throw new UnauthorizedException(INVALID_JWT);
    }
};
