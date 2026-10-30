-- Operações (categorias de alunos) por escola. Vazio = campo oculto.
ALTER TABLE "Organization" ADD COLUMN "studentOperations" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Operação do aluno dentro da escola (vínculo OrganizationMember).
ALTER TABLE "OrganizationMember" ADD COLUMN "operation" TEXT;
