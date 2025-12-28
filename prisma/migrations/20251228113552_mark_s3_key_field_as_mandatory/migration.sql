/*
  Warnings:

  - Made the column `s3_key` on table `attachments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `s3_key` on table `documents` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "attachments" ALTER COLUMN "s3_key" SET NOT NULL;

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "s3_key" SET NOT NULL;
