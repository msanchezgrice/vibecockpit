-- CreateEnum
CREATE TYPE "CodingPlatform" AS ENUM ('CURSOR', 'WINDSURF', 'REPLIT', 'MANUS', 'OPENAI_CANVAS', 'ANTHROPIC_CONSOLE', 'OTHER');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "platform" "CodingPlatform" NOT NULL DEFAULT 'CURSOR',
ADD COLUMN     "thumb_url" TEXT;

-- AlterTable
ALTER TABLE "checklist_items" ADD COLUMN     "is_persistent" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "debug_trigger_log" (
    "log_id" SERIAL NOT NULL,
    "project_id_logged" UUID,
    "logged_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debug_trigger_log_pkey" PRIMARY KEY ("log_id")
);
