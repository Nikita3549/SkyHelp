/*
  Warnings:

  - You are about to drop the column `status` on the `progresses` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "progresses" DROP COLUMN "status";

-- DropEnum
DROP TYPE "ProgressStatus";
