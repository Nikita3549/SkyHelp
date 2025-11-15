-- Add GIN extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateGINIndex
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_claim_details_booking_ref_trgm'
    ) THEN
CREATE INDEX idx_claim_details_booking_ref_trgm
    ON claim_details
    USING GIN (REPLACE(booking_ref, ' ', '') gin_trgm_ops);
END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_claim_details_flight_number_trgm'
    ) THEN
CREATE INDEX idx_claim_details_flight_number_trgm
    ON claim_details
    USING GIN (REPLACE(flight_number, ' ', '') gin_trgm_ops);
END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_claim_customers_phone_trgm'
    ) THEN
CREATE INDEX idx_claim_customers_phone_trgm
    ON claim_customers
    USING GIN (REPLACE(phone, ' ', '') gin_trgm_ops);
END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_claim_customers_email_trgm'
    ) THEN
CREATE INDEX idx_claim_customers_email_trgm
    ON claim_customers
    USING GIN (REPLACE(email, ' ', '') gin_trgm_ops);
END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_claim_customers_first_name_trgm'
    ) THEN
CREATE INDEX idx_claim_customers_first_name_trgm
    ON claim_customers
    USING GIN (REPLACE(first_name, ' ', '') gin_trgm_ops);
END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_claim_customers_last_name_trgm'
    ) THEN
CREATE INDEX idx_claim_customers_last_name_trgm
    ON claim_customers
    USING GIN (REPLACE(last_name, ' ', '') gin_trgm_ops);
END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_claim_customers_full_name_trgm'
    ) THEN
CREATE INDEX idx_claim_customers_full_name_trgm
    ON claim_customers
    USING GIN (REPLACE(first_name || last_name, ' ', '') gin_trgm_ops);
END IF;
END $$;
