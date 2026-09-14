-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('INTERESTED', 'PREPARING', 'APPLIED', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'REJECTED', 'HIRED');

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "url" TEXT,
    "salary" TEXT,
    "appliedDate" TIMESTAMP(3),
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'INTERESTED',
    "interviewDate" TIMESTAMP(3),
    "contact" TEXT,
    "notes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);
