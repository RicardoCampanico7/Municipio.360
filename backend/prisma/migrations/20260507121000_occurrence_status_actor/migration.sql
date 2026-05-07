ALTER TABLE "OccurrenceStatusHistory"
ADD COLUMN "changedByUserId" INTEGER;

CREATE INDEX "OccurrenceStatusHistory_changedByUserId_idx"
ON "OccurrenceStatusHistory"("changedByUserId");

ALTER TABLE "OccurrenceStatusHistory"
ADD CONSTRAINT "OccurrenceStatusHistory_changedByUserId_fkey"
FOREIGN KEY ("changedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
