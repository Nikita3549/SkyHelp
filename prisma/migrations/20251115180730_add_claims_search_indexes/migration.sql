-- CreateIndex
CREATE INDEX "claim_customers_phone_idx" ON "claim_customers"("phone");

-- CreateIndex
CREATE INDEX "claim_customers_email_idx" ON "claim_customers"("email");

-- CreateIndex
CREATE INDEX "claim_customers_first_name_last_name_idx" ON "claim_customers"("first_name", "last_name");

-- CreateIndex
CREATE INDEX "claims_agent_id_idx" ON "claims"("agent_id");

-- CreateIndex
CREATE INDEX "claims_agent_id_created_at_idx" ON "claims"("agent_id", "created_at");
