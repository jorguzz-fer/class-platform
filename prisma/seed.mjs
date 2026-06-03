// Seed em JS puro (ESM) — roda com `node` na imagem de produção (sem precisar
// do tsx, que é devDependency). Cria os planos SaaS e o usuário SUPER_ADMIN.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const plans = [
  {
    name: "Free",
    slug: "free",
    description: "Para começar sua escola digital.",
    price: "0",
    billingCycle: "MONTHLY",
    maxCourses: 3,
    maxStudents: 50,
    maxAdmins: 1,
    hasCustomDomain: false,
    hasCertificates: true,
    hasAnalytics: false,
    hasAiFeatures: false,
  },
  {
    name: "Pro",
    slug: "pro",
    description: "Para escolas em crescimento.",
    price: "99",
    billingCycle: "MONTHLY",
    maxCourses: 50,
    maxStudents: 1000,
    maxAdmins: 5,
    hasCustomDomain: true,
    hasCertificates: true,
    hasAnalytics: true,
    hasAiFeatures: false,
  },
  {
    name: "Business",
    slug: "business",
    description: "Para operações maiores, sem limites.",
    price: "299",
    billingCycle: "MONTHLY",
    maxCourses: null,
    maxStudents: null,
    maxAdmins: 20,
    hasCustomDomain: true,
    hasCertificates: true,
    hasAnalytics: true,
    hasAiFeatures: true,
  },
];

async function main() {
  // Planos SaaS (idempotente).
  for (const plan of plans) {
    await db.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  console.log(`✔ ${plans.length} planos garantidos.`);

  // SUPER_ADMIN da plataforma — credenciais via env, nunca hardcoded.
  const email = process.env.SEED_SUPERADMIN_EMAIL;
  const password = process.env.SEED_SUPERADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Defina SEED_SUPERADMIN_EMAIL e SEED_SUPERADMIN_PASSWORD para criar o super admin.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: {
      name: "Super Admin",
      email,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✔ Super admin garantido: ${email}`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
