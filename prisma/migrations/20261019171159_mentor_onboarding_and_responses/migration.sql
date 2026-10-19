-- CreateEnum
CREATE TYPE "MentorStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "MentorResponseKind" AS ENUM ('interested', 'passed');

-- DropForeignKey
ALTER TABLE "mentor_interest" DROP CONSTRAINT "mentor_interest_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "mentor_interest" DROP CONSTRAINT "mentor_interest_requestId_fkey";

-- DropIndex
DROP INDEX "mentorship_request_status_idx";

-- AlterTable
ALTER TABLE "mentor_profile" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "status" "MentorStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "mentor_interest";

-- CreateTable
CREATE TABLE "mentor_response" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "kind" "MentorResponseKind" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_response_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentor_response_mentorId_idx" ON "mentor_response"("mentorId");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_response_requestId_mentorId_key" ON "mentor_response"("requestId", "mentorId");

-- CreateIndex
CREATE INDEX "mentorship_request_status_createdAt_idx" ON "mentorship_request"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "mentor_profile" ADD CONSTRAINT "mentor_profile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_response" ADD CONSTRAINT "mentor_response_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "mentorship_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_response" ADD CONSTRAINT "mentor_response_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

