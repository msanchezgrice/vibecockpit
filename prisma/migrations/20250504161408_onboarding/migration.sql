-- CreateEnum
CREATE TYPE "CodingPlatform" AS ENUM ('CURSOR', 'WINDSURF', 'REPLIT', 'MANUS', 'OPENAI_CANVAS', 'ANTHROPIC_CONSOLE', 'OTHER');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "platform" "CodingPlatform" NOT NULL DEFAULT 'CURSOR',
ADD COLUMN     "thumb_url" TEXT;
