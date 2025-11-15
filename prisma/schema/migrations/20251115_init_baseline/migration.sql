-- CreateEnum
CREATE TYPE "chat_types" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('READ', 'UNREAD');

-- CreateEnum
CREATE TYPE "ClaimActivityType" AS ENUM ('DOCUMENT', 'EMAIL');

-- CreateEnum
CREATE TYPE "AirlineReason" AS ENUM ('technical_problems', 'weather', 'strike', 'issues', 'other', 'dont_remember');

-- CreateEnum
CREATE TYPE "CancellationNotice" AS ENUM ('less_than_14days', '14days_or_more');

-- CreateEnum
CREATE TYPE "DelayCategory" AS ENUM ('less_than_3hours', 'never_arrived', '3hours_or_more');

-- CreateEnum
CREATE TYPE "DisruptionType" AS ENUM ('denied_boarding', 'cancellation', 'delay', 'missed_connection');

-- CreateEnum
CREATE TYPE "IssueReason" AS ENUM ('delay', 'cancelled', 'denied', 'missed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('bank_transfer', 'paypal', 'wise');

-- CreateEnum
CREATE TYPE "ClaimRecentUpdatesStatus" AS ENUM ('VIEWED', 'UNVIEWED');

-- CreateEnum
CREATE TYPE "ClaimRecentUpdatesType" AS ENUM ('DOCUMENT', 'EMAIL');

-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DocumentRequestType" AS ENUM ('ETICKET', 'PASSPORT', 'BOARDING_PASS', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ASSIGNMENT', 'PASSPORT', 'DOCUMENT', 'ETICKET', 'BOARDING_PASS');

-- CreateEnum
CREATE TYPE "ClaimFlightStatusSource" AS ENUM ('FLIGHT_AWARE', 'FLIGHT_STATS', 'OAG');

-- CreateEnum
CREATE TYPE "OtherPassengerCopiedLinkType" AS ENUM ('DOCUMENT', 'ASSIGNMENT');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('COMPLETED', 'PENDING', 'IN_PROGRESS', 'ESCALATED', 'Claim Received', 'Missing Info', 'Docs Requested', 'Sent to Airline', 'Waiting Airline', 'Approved', 'Paid', 'Rejected', 'Legal Process', 'Closed', 'Not Eligible', 'PAYMENT_RECEIVED');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('COMPLETED', 'IN_PROCESS');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('READ', 'UNREAD');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('INBOX', 'SENT');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PARTNER', 'AGENT', 'CLIENT', 'LAWYER', 'AFFILIATE', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "SignScenarioType" AS ENUM ('MainFlow', 'ExternalFlow', 'OtherPassenger');

-- CreateTable
CREATE TABLE "arrival_airports" (
    "id" TEXT NOT NULL,
    "icao" TEXT NOT NULL,
    "iata" TEXT,
    "name" TEXT NOT NULL,
    "country" TEXT,

    CONSTRAINT "arrival_airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departure_airports" (
    "id" TEXT NOT NULL,
    "icao" TEXT NOT NULL,
    "iata" TEXT,
    "name" TEXT NOT NULL,
    "country" TEXT,

    CONSTRAINT "departure_airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_members" (
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chat_members_pkey" PRIMARY KEY ("chatId","userId")
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL,
    "type" "chat_types" NOT NULL DEFAULT 'DIRECT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MessageStatus" NOT NULL DEFAULT 'UNREAD',

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airlines" (
    "id" TEXT NOT NULL,
    "icao" TEXT NOT NULL,
    "iata" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "airlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_activities" (
    "id" TEXT NOT NULL,
    "type" "ClaimActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_issues" (
    "id" TEXT NOT NULL,
    "delay" "DelayCategory",
    "cancellation_notice_days" "CancellationNotice",
    "disruption_type" "DisruptionType" NOT NULL,
    "airline_reason" "AirlineReason",
    "was_alternative_flight_offered" BOOLEAN NOT NULL DEFAULT false,
    "arrival_time_delay_of_alternative_hours" INTEGER,
    "additional_info" TEXT,
    "has_contacted_airline" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "claim_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_payments" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "terms_agreed" BOOLEAN,
    "payment_method" "PaymentMethod",
    "bank_name" TEXT,
    "account_name" TEXT,
    "account_number" TEXT,
    "iban" TEXT,
    "paypal_email" TEXT,

    CONSTRAINT "claim_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimRecentUpdates" (
    "id" TEXT NOT NULL,
    "type" "ClaimRecentUpdatesType" NOT NULL,
    "status" "ClaimRecentUpdatesStatus" NOT NULL DEFAULT 'UNVIEWED',
    "updated_entity_id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,

    CONSTRAINT "ClaimRecentUpdates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 5,
    "form_state" TEXT DEFAULT '',
    "user_id" TEXT,
    "agent_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details_id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "envelope_id" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "continue_link" TEXT,
    "payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "recent_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "referrer_source" TEXT,
    "referred_by_id" TEXT,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_customers" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "second_address" TEXT,
    "city" TEXT NOT NULL,
    "postal_code" TEXT,
    "state" TEXT,
    "country" TEXT,
    "language" TEXT,
    "whatsapp" BOOLEAN NOT NULL,
    "is_signed" BOOLEAN DEFAULT false,

    CONSTRAINT "claim_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_details" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "airline" TEXT NOT NULL,
    "booking_ref" TEXT,
    "flight_number" TEXT NOT NULL,

    CONSTRAINT "claim_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "arrival_airport" TEXT NOT NULL,
    "departure_airport" TEXT NOT NULL,
    "troubled" BOOLEAN NOT NULL DEFAULT false,
    "details_id" TEXT NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requests" (
    "id" TEXT NOT NULL,
    "type" "DocumentRequestType" NOT NULL,
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'ACTIVE',
    "passengerId" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL DEFAULT 'DOCUMENT',
    "claim_id" TEXT NOT NULL,
    "is_sent" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'DOCUMENT',
    "claim_id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicated_claims" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "duplicated_claim_id" TEXT NOT NULL,

    CONSTRAINT "duplicated_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_flight_statuses" (
    "id" TEXT NOT NULL,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "delay_minutes" INTEGER NOT NULL,
    "source" "ClaimFlightStatusSource" NOT NULL,
    "claimId" TEXT NOT NULL,

    CONSTRAINT "claim_flight_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_passenger_copied_links" (
    "id" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3),
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "other_passenger_id" TEXT,
    "type" "OtherPassengerCopiedLinkType" NOT NULL DEFAULT 'DOCUMENT',

    CONSTRAINT "other_passenger_copied_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_other_passengers" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "birthday" TIMESTAMP(3),
    "isSigned" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "is_minor" BOOLEAN NOT NULL DEFAULT false,
    "parent_first_name" TEXT,
    "parent_last_name" TEXT,

    CONSTRAINT "claim_other_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_states" (
    "id" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'Claim Received',
    "amount" INTEGER NOT NULL,
    "has_recent_update" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_duplicate" BOOLEAN NOT NULL DEFAULT false,
    "is_payment_requested" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,

    CONSTRAINT "claim_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progresses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "comments" TEXT,
    "end_at" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 1,
    "status" "ProgressStatus" NOT NULL DEFAULT 'COMPLETED',
    "claim_state_id" TEXT NOT NULL,
    "updatedBy" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER,
    "path" TEXT NOT NULL,
    "email_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_unsubscribes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "email_unsubscribes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "gmail_thread_id" TEXT NOT NULL,
    "message_id" VARCHAR(255),
    "in_reply_to" TEXT,
    "references" TEXT[],
    "subject" TEXT,
    "normalized_subject" TEXT,
    "from_name" TEXT,
    "from_email" TEXT,
    "to_name" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "snippet" TEXT,
    "body_plain" TEXT,
    "body_html" TEXT,
    "size_estimate" INTEGER,
    "internal_date" TIMESTAMP(3),
    "headers_json" JSONB NOT NULL,
    "type" "EmailType" NOT NULL DEFAULT 'INBOX',
    "status" "EmailStatus" NOT NULL DEFAULT 'UNREAD',
    "claim_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_payments" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "terms_agreed" BOOLEAN,
    "payment_method" "PaymentMethod",
    "bank_name" TEXT,
    "account_name" TEXT,
    "account_number" TEXT,
    "iban" TEXT,
    "paypal_email" TEXT,
    "bic" TEXT,
    "additional_info" TEXT,

    CONSTRAINT "partner_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_settings" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "paymentAlerts" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "partner_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_earnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "settings_id" TEXT,
    "payment_id" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_link_clicks" (
    "clicks" INTEGER NOT NULL DEFAULT 1,
    "link_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_link_clicks_pkey" PRIMARY KEY ("date","link_id")
);

-- CreateTable
CREATE TABLE "referral_links" (
    "id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_payouts" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "partner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_transactions" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_resume_clicks" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_clicked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "email_resume_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "second_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "is_acitve" BOOLEAN NOT NULL DEFAULT true,
    "last_sign" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_scenarios" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "passenger_id" TEXT,
    "request_id" TEXT NOT NULL,
    "scenario" "SignScenarioType" NOT NULL,

    CONSTRAINT "sign_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "routes_arrival_airport_key" ON "routes"("arrival_airport");

-- CreateIndex
CREATE UNIQUE INDEX "routes_departure_airport_key" ON "routes"("departure_airport");

-- CreateIndex
CREATE INDEX "duplicated_claims_claim_id_idx" ON "duplicated_claims"("claim_id");

-- CreateIndex
CREATE UNIQUE INDEX "other_passenger_copied_links_other_passenger_id_type_key" ON "other_passenger_copied_links"("other_passenger_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "email_unsubscribes_email_key" ON "email_unsubscribes"("email");

-- CreateIndex
CREATE INDEX "email_unsubscribes_email_idx" ON "email_unsubscribes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "emails_message_id_key" ON "emails"("message_id");

-- CreateIndex
CREATE INDEX "idx_email_thread_subject" ON "emails"("gmail_thread_id", "normalized_subject");

-- CreateIndex
CREATE UNIQUE INDEX "partners_referral_code_key" ON "partners"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "partners_settings_id_key" ON "partners"("settings_id");

-- CreateIndex
CREATE UNIQUE INDEX "partners_payment_id_key" ON "partners"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "partners_user_id_key" ON "partners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_referral_code_source_key" ON "referral_links"("referral_code", "source");

-- CreateIndex
CREATE UNIQUE INDEX "referral_transactions_claim_id_key" ON "referral_transactions"("claim_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_resume_clicks_claim_id_key" ON "email_resume_clicks"("claim_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_activities" ADD CONSTRAINT "claim_activities_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimRecentUpdates" ADD CONSTRAINT "ClaimRecentUpdates_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_details_id_fkey" FOREIGN KEY ("details_id") REFERENCES "claim_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "claim_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "claim_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "claim_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "claim_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_details" ADD CONSTRAINT "claim_details_airline_fkey" FOREIGN KEY ("airline") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_details_id_fkey" FOREIGN KEY ("details_id") REFERENCES "claim_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_arrival_airport_fkey" FOREIGN KEY ("arrival_airport") REFERENCES "arrival_airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_departure_airport_fkey" FOREIGN KEY ("departure_airport") REFERENCES "departure_airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicated_claims" ADD CONSTRAINT "duplicated_claims_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicated_claims" ADD CONSTRAINT "duplicated_claims_duplicated_claim_id_fkey" FOREIGN KEY ("duplicated_claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_flight_statuses" ADD CONSTRAINT "claim_flight_statuses_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_passenger_copied_links" ADD CONSTRAINT "other_passenger_copied_links_other_passenger_id_fkey" FOREIGN KEY ("other_passenger_id") REFERENCES "claim_other_passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_other_passengers" ADD CONSTRAINT "claim_other_passengers_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progresses" ADD CONSTRAINT "progresses_claim_state_id_fkey" FOREIGN KEY ("claim_state_id") REFERENCES "claim_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progresses" ADD CONSTRAINT "progresses_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "partner_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "partner_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_link_clicks" ADD CONSTRAINT "referral_link_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "referral_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_payouts" ADD CONSTRAINT "referral_payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_transactions" ADD CONSTRAINT "referral_transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_transactions" ADD CONSTRAINT "referral_transactions_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_resume_clicks" ADD CONSTRAINT "email_resume_clicks_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_scenarios" ADD CONSTRAINT "sign_scenarios_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_scenarios" ADD CONSTRAINT "sign_scenarios_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "claim_other_passengers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

