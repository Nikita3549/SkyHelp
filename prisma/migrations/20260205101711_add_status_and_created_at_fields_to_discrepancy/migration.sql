-- CreateEnum
CREATE TYPE "ClaimDiscrepancyStatus" AS ENUM ('INACTIVE', 'ACTIVE');

-- AlterTable
ALTER TABLE "claim_discrepancy" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "ClaimDiscrepancyStatus" NOT NULL DEFAULT 'ACTIVE';
