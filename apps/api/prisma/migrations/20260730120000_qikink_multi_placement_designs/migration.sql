-- Replace single-placement Qikink design fields with a multi-placement JSON array,
-- so one product can carry separate print-ready designs for front, back, sleeve, etc.

-- Add the new column
ALTER TABLE "products" ADD COLUMN "qikinkDesigns" JSONB;

-- Backfill: convert any existing single-design product into a one-entry array
UPDATE "products"
SET "qikinkDesigns" = jsonb_build_array(
  jsonb_build_object(
    'placement', COALESCE("qikinkPlacementSku", 'fr'),
    'designCode', "qikinkDesignCode",
    'designUrl', "qikinkDesignUrl",
    'mockupUrl', "qikinkMockupUrl"
  )
)
WHERE "qikinkDesignUrl" IS NOT NULL;

-- Drop the old single-design columns
ALTER TABLE "products" DROP COLUMN "qikinkDesignCode";
ALTER TABLE "products" DROP COLUMN "qikinkDesignUrl";
ALTER TABLE "products" DROP COLUMN "qikinkMockupUrl";
ALTER TABLE "products" DROP COLUMN "qikinkPlacementSku";
