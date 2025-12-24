/*
  Warnings:

  - The values [SIGNATURE_MISSMATCH,PASSPORT_MISSMATCH] on the enum `DocumentRequestReason` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentRequestReason_new" AS ENUM ('MISSING_DOCUMENT', 'SIGNATURE_MISMATCH', 'PASSPORT_IMAGE_UNCLEAR', 'PASSPORT_MISMATCH');
ALTER TABLE "public"."document_requests" ALTER COLUMN "reason" DROP DEFAULT;
ALTER TABLE "document_requests" ALTER COLUMN "reason" TYPE "DocumentRequestReason_new" USING ("reason"::text::"DocumentRequestReason_new");
ALTER TYPE "DocumentRequestReason" RENAME TO "DocumentRequestReason_old";
ALTER TYPE "DocumentRequestReason_new" RENAME TO "DocumentRequestReason";
DROP TYPE "public"."DocumentRequestReason_old";
ALTER TABLE "document_requests" ALTER COLUMN "reason" SET DEFAULT 'MISSING_DOCUMENT';
COMMIT;
