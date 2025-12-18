-- CreateEnum
CREATE TYPE "PaymentRegion" AS ENUM ('MOLDOVA', 'EU', 'OTHERS');

-- AlterTable
ALTER TABLE "claim_payments" ADD COLUMN     "bic" TEXT,
ADD COLUMN     "idnp" TEXT,
ADD COLUMN     "region" "PaymentRegion";
