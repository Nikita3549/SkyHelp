/*
  Warnings:

  - The values [google] on the enum `OauthProvider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OauthProvider_new" AS ENUM ('GOOGLE');
ALTER TABLE "oauth_accounts" ALTER COLUMN "provider" TYPE "OauthProvider_new" USING ("provider"::text::"OauthProvider_new");
ALTER TYPE "OauthProvider" RENAME TO "OauthProvider_old";
ALTER TYPE "OauthProvider_new" RENAME TO "OauthProvider";
DROP TYPE "public"."OauthProvider_old";
COMMIT;
