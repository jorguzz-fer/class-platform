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
  // Fonte do vídeo: o usuário escolhe o provider e cola URL/ID; o registry
  // (src/lib/video) normaliza em videoId/videoUrl no momento de salvar.
  videoProvider: z.string().trim().max(40).optional().or(z.literal("")),
  videoSource: z.string().trim().max(500).optional().or(z.literal("")),
  // URL do arquivo enviado (ex.: PDF de slides). Guardada em videoUrl para o
  // tipo PDF — reaproveita o campo de URL sem nova coluna no banco.
  fileUrl: z.string().trim().url("URL inválida").max(1000).optional().or(z.literal("")),
  textContent: z.string().trim().max(50000).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).max(100000).optional(),
  isPreview: z.coerce.boolean().default(false),
  isRequired: z.coerce.boolean().default(true),
});

// Material da aula por link (nome + URL onde o arquivo está hospedado).
export const lessonAttachmentSchema = z.object({
  fileName: z.string().trim().min(1, "Informe um nome").max(200),
  fileUrl: z.string().trim().url("URL inválida").max(1000),
});
export type LessonAttachmentInput = z.infer<typeof lessonAttachmentSchema>;

// Reordenação: lista de ids na nova ordem.
export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export type ModuleInput = z.infer<typeof moduleSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;

// ---------------------------------------------------------------------------
// REST API pública: import bulk de curso (integração Aulai)
// ---------------------------------------------------------------------------
// Payload aninhado (curso → módulos → aulas) criado/atualizado num único POST.
// `sourceRef` é o id do recurso no sistema de origem (Aulai): no curso é
// obrigatório (chave de idempotência); em módulos/aulas é opcional, mas quando
// fornecido permite reconciliar a árvore preservando o progresso dos alunos.

const apiSourceRef = z.string().trim().min(1).max(200);

export const apiLessonSchema = z.object({
  sourceRef: apiSourceRef.optional(),
  title: z.string().trim().min(2, "Título muito curto").max(160),
  description: z.string().trim().max(2000).optional(),
  contentType: z.enum(lessonContentTypes).default("VIDEO"),
  // Mesma convenção da UI: escolhe o provider e passa a URL/ID; o registry
  // (src/lib/video) normaliza em videoId/videoUrl ao salvar.
  videoProvider: z.string().trim().max(40).optional(),
  videoSource: z.string().trim().max(500).optional(),
  textContent: z.string().trim().max(50000).optional(),
  durationMinutes: z.coerce.number().int().min(0).max(100000).optional(),
  isPreview: z.coerce.boolean().default(false),
  isRequired: z.coerce.boolean().default(true),
});

export const apiModuleSchema = z.object({
  sourceRef: apiSourceRef.optional(),
  title: z.string().trim().min(2, "Título muito curto").max(160),
  description: z.string().trim().max(2000).optional(),
  lessons: z.array(apiLessonSchema).max(500).default([]),
});

export const apiCourseImportSchema = z.object({
  sourceRef: apiSourceRef,
  title: z.string().trim().min(3, "Título muito curto").max(160),
  subtitle: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  level: z.enum(courseLevels).default("ALL_LEVELS"),
  visibility: z.enum(courseVisibilities).default("PRIVATE"),
  category: z.string().trim().max(80).optional(),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  // Por padrão o import já publica (este é o "gate de publicação" do Aulai).
  // Só publica de fato se houver ao menos um módulo com uma aula (SPEC §11.2).
  publish: z.coerce.boolean().default(true),
  modules: z.array(apiModuleSchema).max(200).default([]),
});

export type ApiLessonInput = z.infer<typeof apiLessonSchema>;
export type ApiModuleInput = z.infer<typeof apiModuleSchema>;
export type ApiCourseImportInput = z.infer<typeof apiCourseImportSchema>;

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

// Auto-inscrição pública: o aluno cria a própria conta ao solicitar um curso.
export const selfEnrollSchema = z.object({
  schoolSlug: z.string().trim().min(1),
  courseSlug: z.string().trim().min(1),
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  password: passwordSchema,
});

// Avaliação por estrelas (1 a 5).
export const ratingSchema = z.object({
  stars: z.coerce.number().int().min(1, "Nota inválida").max(5, "Nota inválida"),
});

// Edição de usuário pelo painel da plataforma (SUPER_ADMIN).
export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(160),
  role: z.enum([
    "SUPER_ADMIN",
    "ORG_OWNER",
    "ORG_ADMIN",
    "INSTRUCTOR",
    "SUPPORT",
    "STUDENT",
  ]),
  isActive: z.coerce.boolean().default(true),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// Redefinição de senha de um usuário pelo painel da plataforma (SUPER_ADMIN).
export const adminResetPasswordSchema = z.object({
  password: passwordSchema,
});
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type SelfEnrollInput = z.infer<typeof selfEnrollSchema>;

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

// ---------------------------------------------------------------------------
// Provas / avaliações de módulo (Fase A)
// ---------------------------------------------------------------------------

export const questionTypes = [
  "SINGLE_CHOICE",
  "TRUE_FALSE",
  "MULTI_SELECT",
  "OPEN",
] as const;

// Configurações da prova. maxAttempts vazio = ilimitado (tratado na ação).
export const quizSettingsSchema = z.object({
  title: z.string().trim().min(2, "Título muito curto").max(160),
  passingScore: z.coerce
    .number({ invalid_type_error: "Nota inválida" })
    .int()
    .min(0, "Mínimo 0")
    .max(10, "Máximo 10"),
  maxAttempts: z.coerce
    .number({ invalid_type_error: "Número inválido" })
    .int()
    .min(1, "Mínimo 1")
    .max(50, "Máximo 50")
    .optional(),
  blocksProgress: z.coerce.boolean().default(true),
});
export type QuizSettingsInput = z.infer<typeof quizSettingsSchema>;

const quizOptionInput = z.object({
  text: z.string().trim().min(1, "Texto da opção vazio").max(500),
  isCorrect: z.boolean(),
});

// Questão (objeto estruturado — opções aninhadas; não vem de FormData).
export const quizQuestionSchema = z
  .object({
    type: z.enum(questionTypes),
    statement: z.string().trim().min(1, "Enunciado vazio").max(2000),
    points: z.coerce.number().int().min(1, "Mínimo 1 ponto").max(100).default(1),
    options: z.array(quizOptionInput).max(10).default([]),
  })
  .superRefine((q, ctx) => {
    if (q.type === "OPEN") return; // dissertativa não tem opções
    if (q.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Inclua ao menos 2 opções.",
      });
      return;
    }
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (q.type === "MULTI_SELECT") {
      if (correct < 1)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Marque ao menos uma opção correta.",
        });
    } else if (correct !== 1) {
      // SINGLE_CHOICE e TRUE_FALSE: exatamente uma correta
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Marque exatamente uma opção correta.",
      });
    }
  });
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;

// Respostas do aluno ao enviar a prova.
export const quizSubmissionSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionIds: z.array(z.string().min(1)).max(10).default([]),
        textAnswer: z.string().max(10000).optional(),
      }),
    )
    .max(100),
});
export type QuizSubmissionInput = z.infer<typeof quizSubmissionSchema>;

// Correção das dissertativas pelo dono.
export const quizGradeSchema = z.object({
  grades: z
    .array(
      z.object({
        answerId: z.string().min(1),
        awardedPoints: z.coerce.number().int().min(0).max(100),
      }),
    )
    .max(100),
});
export type QuizGradeInput = z.infer<typeof quizGradeSchema>;
