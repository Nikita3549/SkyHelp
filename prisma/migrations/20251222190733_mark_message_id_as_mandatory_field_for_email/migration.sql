/*
  Warnings:

  - Made the column `message_id` on table `emails` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "emails" ALTER COLUMN "message_id" SET NOT NULL;
