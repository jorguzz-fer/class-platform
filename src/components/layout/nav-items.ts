import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Award,
  BarChart3,
  Settings,
  CreditCard,
  Building2,
  ShoppingCart,
  ClipboardCheck,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Itens de navegação do painel (compartilhados pela sidebar e pelo menu mobile). */
export const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "Cursos", icon: BookOpen },
  { href: "/dashboard/students", label: "Alunos", icon: Users },
  { href: "/dashboard/enrollments", label: "Matrículas", icon: GraduationCap },
  { href: "/dashboard/companies", label: "Empresas", icon: Building2 },
  { href: "/dashboard/certificates", label: "Certificados", icon: Award },
  { href: "/dashboard/assessments", label: "Correções", icon: ClipboardCheck },
  { href: "/dashboard/sales", label: "Vendas", icon: ShoppingCart },
  { href: "/dashboard/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
  { href: "/dashboard/billing", label: "Cobrança", icon: CreditCard },
];

/** Itens de navegação do super admin (sidebar e menu mobile). */
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Métricas", icon: BarChart3 },
  { href: "/admin/organizations", label: "Organizações", icon: Building2 },
  { href: "/admin/plans", label: "Planos", icon: CreditCard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
];
