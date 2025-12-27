-- CreateEnum
CREATE TYPE "BaggageDelayCategory" AS ENUM ('from_1_to_3_days', 'from_4_to_10_days', 'more_than_10_days');

-- AlterTable
ALTER TABLE "claim_issues" ADD COLUMN     "baggage_delay_category" "BaggageDelayCategory";
