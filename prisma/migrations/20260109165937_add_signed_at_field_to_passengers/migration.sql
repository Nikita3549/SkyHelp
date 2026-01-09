-- AlterTable
ALTER TABLE "claim_customers" ADD COLUMN     "signed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "claim_other_passengers" ADD COLUMN     "signed_at" TIMESTAMP(3);
