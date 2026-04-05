-- CreateTable
CREATE TABLE "OccurrenceInternalComment" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "occurrenceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OccurrenceInternalComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OccurrenceInternalComment_occurrenceId_createdAt_idx" ON "OccurrenceInternalComment"("occurrenceId", "createdAt");

-- CreateIndex
CREATE INDEX "OccurrenceInternalComment_userId_idx" ON "OccurrenceInternalComment"("userId");

-- AddForeignKey
ALTER TABLE "OccurrenceInternalComment" ADD CONSTRAINT "OccurrenceInternalComment_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceInternalComment" ADD CONSTRAINT "OccurrenceInternalComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
