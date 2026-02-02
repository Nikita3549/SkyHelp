-- CreateTable
CREATE TABLE "stats_flight_status_requests" (
    "id" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stats_flight_status_requests_pkey" PRIMARY KEY ("id")
);
