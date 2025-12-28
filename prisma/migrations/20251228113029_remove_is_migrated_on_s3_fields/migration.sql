/*
  Warnings:

  - You are about to drop the column `is_migrated_on_s3` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `is_migrated_on_s3` on the `documents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "is_migrated_on_s3";

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "is_migrated_on_s3";
