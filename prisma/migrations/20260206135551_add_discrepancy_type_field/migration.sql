-- CreateEnum
CREATE TYPE "DiscrepancyType" AS ENUM ('PASSENGER', 'SIGNATURE');

-- AlterTable
ALTER TABLE "claim_discrepancy" ADD COLUMN     "type" "DiscrepancyType" NOT NULL DEFAULT 'PASSENGER';
