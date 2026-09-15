/*
  Warnings:

  - A unique constraint covering the columns `[sourceRowId]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "sourceRowId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_sourceRowId_key" ON "Task"("sourceRowId");
