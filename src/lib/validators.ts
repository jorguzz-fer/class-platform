import { z } from "zod";

/**
 * Schemas Zod — toda entrada externa é validada antes de tocar o banco.
 */

// Slug: minúsculas, números e hífens; usado para subdomínio da escola.
const slugSchema = z
  .string()
  .trim()
  .min(3, "Mínimo de 3 caracteres")
  .max(40, "Máximo de 40 caracteres")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use apenas letras minúsculas, números e hífens",
  );

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres"); // limite do bcrypt

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  password: passwordSchema,
  schoolName: z.string().trim().min(2, "Informe o nome da escola").max(120),
  schoolSlug: slugSchema,
  // LGPD: aceite obrigatório de Termos/Privacidade.
  acceptTerms: z.literal("on", {
    errorMap: () => ({ message: "É necessário aceitar os termos para continuar." }),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// Cursos (Etapa 4)
// ---------------------------------------------------------------------------

const courseLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"] as const;
const courseVisibilities = ["PUBLIC", "PRIVATE", "UNLISTED"] as const;

export const createCourseSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(160),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  level: z.enum(courseLevels).default("ALL_LEVELS"),
  visibility: z.enum(courseVisibilities).default("PRIVATE"),
  category: z.string().trim().max(80).optional().or(z.literal("")),
});

export const updateCourseSchema = createCourseSchema.extend({
  thumbnailUrl: z.string().trim().url("URL inválida").max(500).optional().or(z.literal("")),
  price: z.coerce
    .number({ invalid_type_error: "Preço inválido" })
    .min(0, "Preço não pode ser negativo")
    .max(1_000_000)
    .optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// ---------------------------------------------------------------------------
// Módulos e Aulas (Etapa 5)
// ---------------------------------------------------------------------------

export const moduleSchema = z.object({
  title: z.string().trim().min(2, "Título muito curto").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

const lessonContentTypes = [
  "VIDEO",
  "TEXT",
  "PDF",
  "AUDIO",
  "LIVE",
  "EMBED",
] as const;

export const lessonSchema = z.object({
  title: z.string().trim().min(2, "Título muito curto").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  contentType: z.enum(lessonContentTypes).default("VIDEO"),
  videoProvider: z.string().trim().max(40).optional().or(z.literal("")),
  videoId: z.string().trim().max(200).optional().or(z.literal("")),
  videoUrl: z.string().trim().url("URL inválida").max(500).optional().or(z.literal("")),
  textContent: z.string().trim().max(50000).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).max(100000).optional(),
  isPreview: z.coerce.boolean().default(false),
  isRequired: z.coerce.boolean().default(true),
});

// Reordenação: lista de ids na nova ordem.
export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type ModuleInput = z.infer<typeof moduleSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;

// ---------------------------------------------------------------------------
// Alunos e Matrículas (Etapa 6)
// ---------------------------------------------------------------------------

export const createStudentSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
});

export const updateStudentSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  isActive: z.coerce.boolean().default(true),
});

export const createEnrollmentSchema = z.object({
  studentId: z.string().min(1, "Selecione um aluno"),
  courseId: z.string().min(1, "Selecione um curso"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

// ---------------------------------------------------------------------------
// Configurações da escola (MVP: branding, domínio, time)
// ---------------------------------------------------------------------------

const optionalUrl = z.string().trim().url("URL inválida").max(500).optional().or(z.literal(""));
const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida (use #RRGGBB)")
  .optional()
  .or(z.literal(""));

export const schoolBrandingSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da escola").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  primaryColor: hexColor,
  secondaryColor: hexColor,
  backgroundColor: hexColor,
});

const domainPart = z
  .string()
  .trim()
  .toLowerCase()
  .max(255)
  .optional()
  .or(z.literal(""));

export const schoolDomainSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens")
    .min(3)
    .max(40)
    .optional()
    .or(z.literal("")),
  customDomain: domainPart,
});

const teamRoles = ["ORG_ADMIN", "INSTRUCTOR", "SUPPORT"] as const;

export const inviteTeamMemberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  role: z.enum(teamRoles),
});

export type SchoolBrandingInput = z.infer<typeof schoolBrandingSchema>;
export type SchoolDomainInput = z.infer<typeof schoolDomainSchema>;
export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;

// ---------------------------------------------------------------------------
// Perfil do usuário
// ---------------------------------------------------------------------------

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  avatarUrl: z.string().trim().url("URL inválida").max(500).optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ---------------------------------------------------------------------------
// IA (Fase 4)
// ---------------------------------------------------------------------------

export const aiOutlineSchema = z.object({
  topic: z.string().trim().min(3, "Descreva o tema do curso").max(200),
  level: z.string().trim().max(40).optional().or(z.literal("")),
  audience: z.string().trim().max(120).optional().or(z.literal("")),
});

export type AIOutlineInput = z.infer<typeof aiOutlineSchema>;

// ---------------------------------------------------------------------------
// B2B / Enterprise (Fase 6)
// ---------------------------------------------------------------------------

export const createCompanySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa").max(160),
  cnpj: z.string().trim().max(20).optional().or(z.literal("")),
  contactEmail: z.string().trim().toLowerCase().email("E-mail inválido").max(160).optional().or(z.literal("")),
});

export const addManagerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
});

export const createCohortSchema = z.object({
  companyId: z.string().min(1),
  courseId: z.string().min(1, "Selecione um curso"),
  name: z.string().trim().min(2, "Informe o nome da turma").max(160),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type AddManagerInput = z.infer<typeof addManagerSchema>;
export type CreateCohortInput = z.infer<typeof createCohortSchema>;

// ---------------------------------------------------------------------------
// Comunidade (Fase 3)
// ---------------------------------------------------------------------------

export const createPostSchema = z.object({
  content: z.string().trim().min(1, "Escreva algo").max(5000),
  courseId: z.string().optional().or(z.literal("")),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Escreva um comentário").max(2000),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CommentInput = z.infer<typeof commentSchema>;

// ---------------------------------------------------------------------------
// Vendas e Checkout (Fase 2)
// ---------------------------------------------------------------------------

export const createCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Mínimo de 3 caracteres")
    .max(40)
    .regex(/^[A-Z0-9_-]+$/, "Use letras, números, hífen ou underline"),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.coerce.number().positive("Valor inválido").max(1_000_000),
  maxRedemptions: z.coerce.number().int().positive().max(1_000_000).optional(),
});

export const checkoutSchema = z.object({
  method: z.enum(["PIX", "CARD", "BOLETO"]),
  couponCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal("")),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
