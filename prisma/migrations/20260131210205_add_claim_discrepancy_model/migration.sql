-- CreateEnum
CREATE TYPE "ClaimDiscrepancyFieldName" AS ENUM ('FIRST_NAME', 'LAST_NAME');

-- CreateTable
CREATE TABLE "claim_discrepancy" (
    "id" TEXT NOT NULL,
    "field_name" "ClaimDiscrepancyFieldName" NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "extracted_value" TEXT NOT NULL,

    CONSTRAINT "claim_discrepancy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "claim_discrepancy" ADD CONSTRAINT "claim_discrepancy_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
