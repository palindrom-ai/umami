-- AlterTable: Make password nullable for OAuth users
ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: Add OAuth fields
ALTER TABLE "user" ADD COLUMN "email" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN "provider" VARCHAR(50);
ALTER TABLE "user" ADD COLUMN "provider_id" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: Unique email constraint
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex: Email lookup index
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex: Provider lookup index
CREATE INDEX "user_provider_provider_id_idx" ON "user"("provider", "provider_id");

-- Update existing users to have provider = 'credentials'
UPDATE "user" SET "provider" = 'credentials' WHERE "provider" IS NULL AND "password" IS NOT NULL;
