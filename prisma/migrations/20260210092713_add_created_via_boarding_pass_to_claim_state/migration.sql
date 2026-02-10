-- CreateEnum
CREATE TYPE "CreatedViaBoardingPassType" AS ENUM ('SCAN', 'UPLOAD');

-- AlterTable
ALTER TABLE "claim_states" ADD COLUMN     "created_via_boarding_pass" "CreatedViaBoardingPassType";
