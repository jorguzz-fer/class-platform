import Link from "next/link";
import { GraduationCap, BookOpen, Users, Award } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: BookOpen,
    title: "Cursos e conteúdos",
    description:
      "Organize cursos em módulos e aulas com vídeo, texto e materiais complementares.",
  },
  {
    icon: Users,
    title: "Alunos e matrículas",
    description:
      "Cadastre alunos, gerencie matrículas e acompanhe o progresso de cada turma.",
  },
  {
    icon: Award,
    title: "Certificados",
    description:
      "Emita certificados com código de verificação quando o aluno concluir o curso.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-6 w-6" />
            <span>ClassOS</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Entrar
            </Link>
            <Link href="/register" className={cn(buttonVariants())}>
              Criar escola
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container flex flex-col items-center gap-6 py-24 text-center">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            O sistema operacional do seu negócio educacional
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Crie sua própria escola digital: hospede cursos, gerencie alunos,
            emita certificados e personalize tudo com a sua marca.
          </p>
          <div className="flex gap-3">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
              Começar agora
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        <section className="container grid gap-8 pb-24 sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3">
              <feature.icon className="h-8 w-8" />
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} ClassOS</span>
        </div>
      </footer>
    </div>
  );
}
