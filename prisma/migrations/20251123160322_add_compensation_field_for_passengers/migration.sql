-- AlterTable
ALTER TABLE "claim_customers" ADD COLUMN     "compensation" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "claim_other_passengers" ADD COLUMN     "compensation" INTEGER NOT NULL DEFAULT 0;
