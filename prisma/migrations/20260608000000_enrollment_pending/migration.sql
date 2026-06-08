-- AlterEnum
-- Adiciona o status PENDING (solicitação de inscrição aguardando aprovação do dono).
-- Postgres 12+ permite ADD VALUE dentro de transação. Posicionado antes de ACTIVE
-- só por legibilidade; a ordem do enum não tem efeito funcional.
ALTER TYPE "EnrollmentStatus" ADD VALUE 'PENDING' BEFORE 'ACTIVE';
