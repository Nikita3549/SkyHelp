/*
  Warnings:

  - Added the required column `claim_id` to the `claim_discrepancy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "claim_discrepancy" ADD COLUMN     "claim_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "claim_discrepancy" ADD CONSTRAINT "claim_discrepancy_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
