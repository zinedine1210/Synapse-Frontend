import { BookOpen, LayoutDashboard, GraduationCap, Settings, TrendingUp, Users, Layers, MessageSquare, School, Wallet, CheckSquare, HelpCircle, UtensilsCrossed, Receipt, Lightbulb, Gamepad2, Database, FileText } from 'lucide-react';

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
  requiredFeature?: string; // Feature key from PricingPlan.features for access control
  badge?: string; // Label badge opsional (e.g., "NEW", "PRO")
}

/**
 * Primary navigation items — always visible in the sidebar.
 * Max 6 items for progressive disclosure (Requirement 10.2, 10.3).
 */
export const primaryNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Kelas Saya',
    path: '/classes',
    icon: BookOpen,
    requiredFeature: 'class',
  },
  {
    label: 'Duit Tracker',
    path: '/duit-tracker',
    icon: Wallet,
    requiredFeature: 'duit_tracker',
  },
  {
    label: 'To-Do List',
    path: '/todos',
    icon: CheckSquare,
    requiredFeature: 'todo_list',
  },
  {
    label: 'Q&A',
    path: '/qna',
    icon: HelpCircle,
    requiredFeature: 'qna_public',
  },
  {
    label: 'Skripsweet',
    path: '/skripsweet',
    icon: GraduationCap,
    requiredFeature: 'skripsweet',
    badge: 'NEW',
  },
];

/**
 * Secondary navigation items — grouped under "Lainnya" collapsed section.
 * Phase 2 items (Requirement 10.4).
 */
export const secondaryNavItems: NavItem[] = [
  {
    label: 'Makan Apa',
    path: '/makan',
    icon: UtensilsCrossed,
    requiredFeature: 'food_recommend',
  },
  {
    label: 'Split Bill',
    path: '/split-bill',
    icon: Receipt,
    requiredFeature: 'split_bill',
  },
  {
    label: 'Insight',
    path: '/insight',
    icon: Lightbulb,
    requiredFeature: 'ai_insight',
  },
  {
    label: 'Quiz Keuangan',
    path: '/quiz-keuangan',
    icon: Gamepad2,
    requiredFeature: 'quiz_keuangan',
    badge: 'NEW',
  },
];

/**
 * Combined nav items for backwards compatibility.
 * Used by components that don't yet support progressive disclosure.
 */
export const navItems: NavItem[] = [...primaryNavItems, ...secondaryNavItems];

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
