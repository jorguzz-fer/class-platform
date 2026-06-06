-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "sourceRef" TEXT;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "sourceRef" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "sourceRef" TEXT;

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_organizationId_sourceRef_key" ON "Course"("organizationId", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "Module_courseId_sourceRef_key" ON "Module"("courseId", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_moduleId_sourceRef_key" ON "Lesson"("moduleId", "sourceRef");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
