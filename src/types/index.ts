// Tipos compartilhados da aplicação.
// Re-exporta os tipos/enums do Prisma para uso conveniente na UI.
export type {
  User,
  Organization,
  School,
  Course,
  Module,
  Lesson,
  Enrollment,
  LessonProgress,
  Certificate,
  Plan,
  Subscription,
} from "@prisma/client";

export {
  UserRole,
  OrganizationStatus,
  SubscriptionStatus,
  CourseStatus,
  CourseVisibility,
  CourseLevel,
  LessonContentType,
  EnrollmentStatus,
  ProgressStatus,
  BillingCycle,
} from "@prisma/client";
