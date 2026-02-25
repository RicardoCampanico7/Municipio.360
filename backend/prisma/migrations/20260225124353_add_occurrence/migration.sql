-- CreateTable
CREATE TABLE "Occurrence" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'SUBMETIDA',
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Occurrence_userId_idx" ON "Occurrence"("userId");

-- CreateIndex
CREATE INDEX "Occurrence_status_idx" ON "Occurrence"("status");

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
