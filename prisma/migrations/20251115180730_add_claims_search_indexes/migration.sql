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

-- Add GIN extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateGINIndex
CREATE INDEX idx_claim_details_booking_ref_trgm
    ON claim_details
    USING GIN (REPLACE(booking_ref, ' ', '') gin_trgm_ops);

-- CreateGINIndex
CREATE INDEX idx_claim_details_flight_number_trgm
    ON claim_details
    USING GIN (REPLACE(flight_number, ' ', '') gin_trgm_ops);

-- CreateGINIndex
CREATE INDEX idx_claim_customers_phone_trgm
    ON claim_customers
    USING GIN (REPLACE(phone, ' ', '') gin_trgm_ops);

-- CreateGINIndex
CREATE INDEX idx_claim_customers_email_trgm
    ON claim_customers
    USING GIN (REPLACE(email, ' ', '') gin_trgm_ops);

-- CreateGINIndex
CREATE INDEX idx_claim_customers_first_name_trgm
    ON claim_customers
    USING GIN (REPLACE(first_name, ' ', '') gin_trgm_ops);

-- CreateGINIndex
CREATE INDEX idx_claim_customers_last_name_trgm
    ON claim_customers
    USING GIN (REPLACE(last_name, ' ', '') gin_trgm_ops);

-- CreateGINIndex
CREATE INDEX idx_claim_customers_full_name_trgm
    ON claim_customers
    USING GIN (REPLACE(first_name || last_name, ' ', '') gin_trgm_ops);