-- CreateTable
CREATE TABLE "staff_messages" (
    "id" TEXT NOT NULL,
    "from_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "body" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,

    CONSTRAINT "staff_messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "staff_messages" ADD CONSTRAINT "staff_messages_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_messages" ADD CONSTRAINT "staff_messages_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
