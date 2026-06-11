import { BookOpen, LayoutDashboard, GraduationCap, CreditCard, Settings, TrendingUp, Users, Layers, MessageSquare, School, Wallet, CheckSquare, HelpCircle, UtensilsCrossed, Receipt, Lightbulb, Gamepad2, Database } from 'lucide-react';

/**
 * 🗺️ Centralized Navigation Registry
 * ────────────────────────────────────
 * Untuk menambah halaman baru:
 * 1. Buat file di src/app/[route]/page.tsx
 * 2. Tambahkan satu entry di bawah ini
 * Sidebar akan merender tombol baru secara otomatis.
 */

export interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  requiredPlan?: 'FREE' | 'PRO';
  requiredRole?: 'USER' | 'SUPERADMIN';
  badge?: string; // Label badge opsional (e.g., "NEW", "PRO")
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Kelas Saya',
    path: '/classes',
    icon: BookOpen,
  },
  {
    label: 'Duit Tracker',
    path: '/duit-tracker',
    icon: Wallet,
    badge: 'NEW',
  },
  {
    label: 'To-Do List',
    path: '/todos',
    icon: CheckSquare,
    badge: 'NEW',
  },
  {
    label: 'Q&A',
    path: '/qna',
    icon: HelpCircle,
    badge: 'NEW',
  },
  {
    label: 'Makan Apa',
    path: '/makan',
    icon: UtensilsCrossed,
    badge: 'NEW',
  },
  {
    label: 'Split Bill',
    path: '/split-bill',
    icon: Receipt,
    badge: 'NEW',
  },
  {
    label: 'Insight',
    path: '/insight',
    icon: Lightbulb,
    badge: 'NEW',
  },
  {
    label: 'Billing',
    path: '/billing',
    icon: CreditCard,
  },
];

export const settingsNavItem: NavItem = {
  label: 'Pengaturan',
  path: '/settings',
  icon: Settings,
};

export const superadminNavItems: NavItem[] = [
  {
    label: 'Analitik',
    path: '/superadmin',
    icon: TrendingUp,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Pengguna',
    path: '/superadmin/users',
    icon: Users,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Kelas',
    path: '/superadmin/classes',
    icon: School,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Forum',
    path: '/superadmin/forum',
    icon: MessageSquare,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Paket',
    path: '/superadmin/plans',
    icon: Layers,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Akademik',
    path: '/superadmin/academic',
    icon: GraduationCap,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Duit Tracker',
    path: '/superadmin/duit-tracker',
    icon: Wallet,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Gamifikasi',
    path: '/superadmin/gamification',
    icon: Gamepad2,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Q&A',
    path: '/superadmin/qna',
    icon: HelpCircle,
    requiredRole: 'SUPERADMIN',
  },
  {
    label: 'Sistem',
    path: '/superadmin/system',
    icon: Database,
    requiredRole: 'SUPERADMIN',
  },
];
