-- DropForeignKey
ALTER TABLE "ClaimRecentUpdates" DROP CONSTRAINT "ClaimRecentUpdates_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "claim_activities" DROP CONSTRAINT "claim_activities_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "claim_discrepancy" DROP CONSTRAINT "claim_discrepancy_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "claim_flight_statuses" DROP CONSTRAINT "claim_flight_statuses_claimId_fkey";

-- DropForeignKey
ALTER TABLE "claims" DROP CONSTRAINT "claims_agent_id_fkey";

-- DropForeignKey
ALTER TABLE "claims" DROP CONSTRAINT "claims_user_id_fkey";

-- DropForeignKey
ALTER TABLE "document_requests" DROP CONSTRAINT "document_requests_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "duplicated_claims" DROP CONSTRAINT "duplicated_claims_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "duplicated_claims" DROP CONSTRAINT "duplicated_claims_duplicated_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "email_resume_clicks" DROP CONSTRAINT "email_resume_clicks_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "emails" DROP CONSTRAINT "emails_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "meteo_statuses" DROP CONSTRAINT "meteo_statuses_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "staff_messages" DROP CONSTRAINT "staff_messages_claim_id_fkey";

-- AddForeignKey
ALTER TABLE "claim_activities" ADD CONSTRAINT "claim_activities_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRecentUpdates" ADD CONSTRAINT "ClaimRecentUpdates_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_discrepancy" ADD CONSTRAINT "claim_discrepancy_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicated_claims" ADD CONSTRAINT "duplicated_claims_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicated_claims" ADD CONSTRAINT "duplicated_claims_duplicated_claim_id_fkey" FOREIGN KEY ("duplicated_claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_flight_statuses" ADD CONSTRAINT "claim_flight_statuses_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meteo_statuses" ADD CONSTRAINT "meteo_statuses_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_messages" ADD CONSTRAINT "staff_messages_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_resume_clicks" ADD CONSTRAINT "email_resume_clicks_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
