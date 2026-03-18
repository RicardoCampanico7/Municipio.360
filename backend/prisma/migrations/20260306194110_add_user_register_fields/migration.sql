-- AlterTable
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "biNumber" TEXT,
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "postalCode" TEXT;

-- Fill legacy users before making the new columns required.
UPDATE "User"
SET "name" = COALESCE(NULLIF(split_part("email", '@', 1), ''), 'Utilizador ' || "id"::text)
WHERE "name" IS NULL OR btrim("name") = '';

UPDATE "User"
SET "biNumber" = lpad("id"::text, 8, '0') || ' MIG'
WHERE "biNumber" IS NULL OR btrim("biNumber") = '';

UPDATE "User"
SET "postalCode" = '0000-000'
WHERE "postalCode" IS NULL OR btrim("postalCode") = '';

ALTER TABLE "User"
ALTER COLUMN "biNumber" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "postalCode" SET NOT NULL;
