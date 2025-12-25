-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClaimActivityType" ADD VALUE 'ASSIGNMENT';
ALTER TYPE "ClaimActivityType" ADD VALUE 'BOARDING_PASS';
ALTER TYPE "ClaimActivityType" ADD VALUE 'ETICKET';
ALTER TYPE "ClaimActivityType" ADD VALUE 'PASSPORT';
