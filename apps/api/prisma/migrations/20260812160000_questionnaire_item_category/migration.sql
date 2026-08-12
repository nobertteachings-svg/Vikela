-- AlterTable
ALTER TABLE "QuestionnaireItem" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT '';
