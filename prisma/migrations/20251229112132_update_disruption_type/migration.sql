/*
  Warnings:

  - The values [delayed_baggage,lost_baggage] on the enum `DisruptionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DisruptionType_new" AS ENUM ('denied_boarding', 'cancellation', 'delay', 'missed_connection', 'delayed_or_lost_baggage', 'damaged_baggage', 'other_baggage_problem');
ALTER TABLE "claim_issues" ALTER COLUMN "disruption_type" TYPE "DisruptionType_new" USING ("disruption_type"::text::"DisruptionType_new");
ALTER TYPE "DisruptionType" RENAME TO "DisruptionType_old";
ALTER TYPE "DisruptionType_new" RENAME TO "DisruptionType";
DROP TYPE "public"."DisruptionType_old";
COMMIT;
