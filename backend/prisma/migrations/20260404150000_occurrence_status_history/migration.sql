CREATE TABLE "OccurrenceStatusHistory" (
    "id" SERIAL NOT NULL,
    "status" "OccurrenceStatus" NOT NULL,
    "occurrenceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccurrenceStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OccurrenceStatusHistory_occurrenceId_createdAt_idx"
ON "OccurrenceStatusHistory"("occurrenceId", "createdAt");

ALTER TABLE "OccurrenceStatusHistory"
ADD CONSTRAINT "OccurrenceStatusHistory_occurrenceId_fkey"
FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
