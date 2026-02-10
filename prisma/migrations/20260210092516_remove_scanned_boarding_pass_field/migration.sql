/*
  Warnings:

  - You are about to drop the column `scanned_boarding_pass` on the `claim_states` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "claim_states" DROP COLUMN "scanned_boarding_pass";
