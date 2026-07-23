-- AlterTable
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "featuredImageUrl" TEXT;
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "collections_isFeatured_idx" ON "collections"("isFeatured");
