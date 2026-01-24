-- CreateEnum
CREATE TYPE "MeteoStatusReason" AS ENUM ('RVR_LOW', 'SNOCLO', 'CROSSWIND_HIGH', 'CEILING_LOW', 'WINDSHEAR');

-- CreateTable
CREATE TABLE "meteo_status_runways" (
    "id" TEXT NOT NULL,
    "runway_id" TEXT,
    "crosswind_kt" DOUBLE PRECISION,
    "headwind_kt" DOUBLE PRECISION,
    "is_safe" BOOLEAN NOT NULL,
    "meteo_status_id" TEXT NOT NULL,

    CONSTRAINT "meteo_status_runways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meteo_statuses" (
    "id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "observed_time_utc" TIMESTAMP(3),
    "visibility_m" DOUBLE PRECISION,
    "wind_dir" DOUBLE PRECISION,
    "wind_speed_kt" DOUBLE PRECISION,
    "wind_gust_kt" DOUBLE PRECISION,
    "ceiling_ft" DOUBLE PRECISION,
    "is_snoclo" BOOLEAN,
    "has_windshear" BOOLEAN,
    "raw_metar_text" TEXT,
    "takeoff_ok" BOOLEAN NOT NULL DEFAULT true,
    "lenging_ok" BOOLEAN NOT NULL DEFAULT true,
    "reason" "MeteoStatusReason",

    CONSTRAINT "meteo_statuses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "meteo_status_runways" ADD CONSTRAINT "meteo_status_runways_meteo_status_id_fkey" FOREIGN KEY ("meteo_status_id") REFERENCES "meteo_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meteo_statuses" ADD CONSTRAINT "meteo_statuses_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
