/*
  Warnings:

  - You are about to drop the `sign_scenarios` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."sign_scenarios" DROP CONSTRAINT "sign_scenarios_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."sign_scenarios" DROP CONSTRAINT "sign_scenarios_passenger_id_fkey";

-- DropTable
DROP TABLE "public"."sign_scenarios";

-- DropEnum
DROP TYPE "public"."SignScenarioType";
