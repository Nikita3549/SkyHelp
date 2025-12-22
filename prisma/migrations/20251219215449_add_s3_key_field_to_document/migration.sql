-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "s3_key" TEXT,
ALTER COLUMN "path" DROP NOT NULL;
