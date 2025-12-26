import { ClaimCustomer, OtherPassenger } from '@prisma/client';

export type BasePassenger =
    | (ClaimCustomer & {
          isCustomer: true;
          claimId: string;
          isMinor: false;
      })
    | (OtherPassenger & {
          isCustomer: false;
      });
