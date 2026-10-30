-- Presença no treinamento presencial do certificado. Opcional; attendedAt
-- normalmente recebe a mesma data de emissão quando a presença é marcada.
ALTER TABLE "Certificate" ADD COLUMN "attendedInPerson" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Certificate" ADD COLUMN "attendedAt" TIMESTAMP(3);
