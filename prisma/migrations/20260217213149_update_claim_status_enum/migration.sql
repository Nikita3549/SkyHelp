-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClaimStatus" ADD VALUE 'INCOMPLETE';
ALTER TYPE "ClaimStatus" ADD VALUE 'PRECOURT';
ALTER TYPE "ClaimStatus" ADD VALUE 'COURT_IN_PROGRESS';
ALTER TYPE "ClaimStatus" ADD VALUE 'COURT_WON';
ALTER TYPE "ClaimStatus" ADD VALUE 'COURT_LOST';
