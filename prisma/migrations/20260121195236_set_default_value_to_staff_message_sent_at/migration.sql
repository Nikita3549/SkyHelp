/*
  Warnings:

  - Made the column `sent_at` on table `staff_messages` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "staff_messages" ALTER COLUMN "sent_at" SET NOT NULL,
ALTER COLUMN "sent_at" SET DEFAULT CURRENT_TIMESTAMP;
