-- CreateIndex
CREATE INDEX "claim_states_status_idx" ON "claim_states"("status");

-- CreateIndex
CREATE INDEX "claims_archived_idx" ON "claims"("archived");

-- CreateIndex
CREATE INDEX "claims_user_id_idx" ON "claims"("user_id");
