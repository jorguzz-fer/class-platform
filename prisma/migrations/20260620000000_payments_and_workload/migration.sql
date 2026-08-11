-- Carga horária (horas) do curso, exibida no certificado. Opcional.
ALTER TABLE "Course" ADD COLUMN "workloadHours" INTEGER;

-- Gateway de pagamento por tenant (Asaas). API key cifrada; nunca em texto puro.
CREATE TYPE "PaymentGateway" AS ENUM ('ASAAS');
CREATE TYPE "PaymentEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "PaymentGateway" NOT NULL DEFAULT 'ASAAS',
    "environment" "PaymentEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "apiKeyEnc" TEXT,
    "webhookToken" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAccount_organizationId_key" ON "PaymentAccount"("organizationId");

ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
