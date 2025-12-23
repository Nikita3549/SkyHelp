-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "is_migrated_on_s3" BOOLEAN NOT NULL DEFAULT false;
