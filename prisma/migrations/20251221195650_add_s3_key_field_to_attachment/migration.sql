-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "s3_key" TEXT,
ALTER COLUMN "path" DROP NOT NULL;
