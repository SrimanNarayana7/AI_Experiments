-- AlterTable
ALTER TABLE "MasterResume" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Master Resume';
ALTER TABLE "MasterResume" ADD COLUMN     "originalFilename" TEXT;
ALTER TABLE "MasterResume" ADD COLUMN     "mimeType" TEXT;
ALTER TABLE "MasterResume" ADD COLUMN     "fileSize" INTEGER;
ALTER TABLE "MasterResume" ADD COLUMN     "storagePath" TEXT;
ALTER TABLE "MasterResume" ADD COLUMN     "extractedText" TEXT;
ALTER TABLE "MasterResume" ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "appliedAt" TIMESTAMP(3);
