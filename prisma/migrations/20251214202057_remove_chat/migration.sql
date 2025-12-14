/*
  Warnings:

  - You are about to drop the `chat_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `messages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."chat_members" DROP CONSTRAINT "chat_members_chatId_fkey";

-- DropForeignKey
ALTER TABLE "public"."chat_members" DROP CONSTRAINT "chat_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."messages" DROP CONSTRAINT "messages_chat_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."messages" DROP CONSTRAINT "messages_sender_id_fkey";

-- DropTable
DROP TABLE "public"."chat_members";

-- DropTable
DROP TABLE "public"."chats";

-- DropTable
DROP TABLE "public"."messages";

-- DropEnum
DROP TYPE "public"."MessageStatus";

-- DropEnum
DROP TYPE "public"."chat_types";
