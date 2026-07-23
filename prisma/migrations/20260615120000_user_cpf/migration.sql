-- CPF do aluno (11 dígitos, sem máscara). Opcional para os já existentes;
-- obrigatório no cadastro novo (validado na aplicação).
ALTER TABLE "User" ADD COLUMN "cpf" TEXT;
