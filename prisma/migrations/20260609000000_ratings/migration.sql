-- CreateTable
CREATE TABLE "CourseRating" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonRating" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseRating_organizationId_idx" ON "CourseRating"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRating_courseId_studentId_key" ON "CourseRating"("courseId", "studentId");

-- CreateIndex
CREATE INDEX "LessonRating_organizationId_idx" ON "LessonRating"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonRating_lessonId_studentId_key" ON "LessonRating"("lessonId", "studentId");

-- AddForeignKey
ALTER TABLE "CourseRating" ADD CONSTRAINT "CourseRating_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRating" ADD CONSTRAINT "LessonRating_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
