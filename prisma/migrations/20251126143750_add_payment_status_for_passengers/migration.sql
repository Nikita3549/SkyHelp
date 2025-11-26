-- CreateEnum
CREATE TYPE "PassengerPaymentStatus" AS ENUM ('RECEIVED', 'PENDING', 'PAID');

-- AlterTable
ALTER TABLE "claim_customers" ADD COLUMN     "paymentStatus" "PassengerPaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "claim_other_passengers" ADD COLUMN     "paymentStatus" "PassengerPaymentStatus" NOT NULL DEFAULT 'PENDING';
