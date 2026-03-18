CREATE TYPE "OccurrenceCategory" AS ENUM (
  'BURACOS_PAVIMENTO',
  'ILUMINACAO_PUBLICA',
  'LIMPEZA_URBANA',
  'RUIDO',
  'ESPACOS_PUBLICOS',
  'SINALIZACAO',
  'OUTROS'
);

ALTER TABLE "Occurrence"
ADD COLUMN "category_new" "OccurrenceCategory",
ADD COLUMN "otherCategoryDetail" TEXT;

UPDATE "Occurrence"
SET
  "category_new" = CASE
    WHEN "category" IN ('BURACOS_PAVIMENTO', 'Buracos e pavimento', 'Buraco na estrada') THEN 'BURACOS_PAVIMENTO'::"OccurrenceCategory"
    WHEN "category" IN ('ILUMINACAO_PUBLICA', 'Iluminacao publica', 'Iluminação pública') THEN 'ILUMINACAO_PUBLICA'::"OccurrenceCategory"
    WHEN "category" IN ('LIMPEZA_URBANA', 'Limpeza urbana') THEN 'LIMPEZA_URBANA'::"OccurrenceCategory"
    WHEN "category" IN ('RUIDO', 'Ruido', 'Ruído') THEN 'RUIDO'::"OccurrenceCategory"
    WHEN "category" IN ('ESPACOS_PUBLICOS', 'Espacos publicos', 'Espaços públicos') THEN 'ESPACOS_PUBLICOS'::"OccurrenceCategory"
    WHEN "category" IN ('SINALIZACAO', 'Sinalizacao', 'Sinalização') THEN 'SINALIZACAO'::"OccurrenceCategory"
    WHEN "category" IN ('OUTROS', 'Outros') THEN 'OUTROS'::"OccurrenceCategory"
    ELSE 'OUTROS'::"OccurrenceCategory"
  END,
  "otherCategoryDetail" = CASE
    WHEN "category" IN (
      'BURACOS_PAVIMENTO',
      'Buracos e pavimento',
      'Buraco na estrada',
      'ILUMINACAO_PUBLICA',
      'Iluminacao publica',
      'Iluminação pública',
      'LIMPEZA_URBANA',
      'Limpeza urbana',
      'RUIDO',
      'Ruido',
      'Ruído',
      'ESPACOS_PUBLICOS',
      'Espacos publicos',
      'Espaços públicos',
      'SINALIZACAO',
      'Sinalizacao',
      'Sinalização',
      'OUTROS',
      'Outros'
    ) THEN NULL
    ELSE "category"
  END;

ALTER TABLE "Occurrence"
ALTER COLUMN "category_new" SET NOT NULL;

ALTER TABLE "Occurrence" DROP COLUMN "category";

ALTER TABLE "Occurrence" RENAME COLUMN "category_new" TO "category";
