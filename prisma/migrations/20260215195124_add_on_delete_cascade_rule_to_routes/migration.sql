-- DropForeignKey
ALTER TABLE "claim_details" DROP CONSTRAINT "claim_details_airline_fkey";

-- DropForeignKey
ALTER TABLE "routes" DROP CONSTRAINT "routes_details_id_fkey";

-- AddForeignKey
ALTER TABLE "claim_details" ADD CONSTRAINT "claim_details_airline_fkey" FOREIGN KEY ("airline") REFERENCES "airlines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_details_id_fkey" FOREIGN KEY ("details_id") REFERENCES "claim_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
