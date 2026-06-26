'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, Sun, Moon, CreditCard } from 'lucide-react';
import { primaryNavItems, secondaryNavItems, superadminNavItems, settingsNavItem, NavItem } from '@/config/navigation';
import { brand } from '@/config/brand';
import { useTheme } from '@/lib/ThemeContext';
import { useFeatureAccess } from '@/lib/feature-access';
import { XpBar } from './XpBar';

interface SidebarProps {
  userRole?: 'USER' | 'SUPERADMIN';
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export function Sidebar({ userRole = 'USER', collapsed: controlledCollapsed, onToggle }: SidebarProps) {
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [lainnyaOpen, setLainnyaOpen] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : localCollapsed;
  const setCollapsed = onToggle ? onToggle : setLocalCollapsed;
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { hasFeature } = useFeatureAccess();

  // For superadmin, show superadmin items only; for regular users, use progressive disclosure
  const isSuperadmin = userRole === 'SUPERADMIN';

  // Filter nav items based on feature access (items without requiredFeature are always shown)
  const filteredPrimaryNavItems = primaryNavItems.filter(
    (item) => !item.requiredFeature || hasFeature(item.requiredFeature)
  );
  const filteredSecondaryNavItems = secondaryNavItems.filter(
    (item) => !item.requiredFeature || hasFeature(item.requiredFeature)
  );

  // Auto-expand "Lainnya" if the user is on a secondary page
  const isOnSecondaryPage = filteredSecondaryNavItems.some(
    (item) => pathname === item.path || pathname?.startsWith(item.path + '/')
  );

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');

    return (
      <li key={item.path}>
        <Link
          href={item.path}
          title={collapsed ? item.label : undefined}
          data-tour={item.path.replace('/', '')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: collapsed ? '0.6rem' : '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            textDecoration: 'none',
            position: 'relative',
            background: isActive ? 'rgba(var(--color-primary) / 0.1)' : 'transparent',
            transition: 'var(--transition-fast)',
            color: isActive ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
          }}
        >
          {isActive && (
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: '55%',
                borderRadius: '0 3px 3px 0',
                background: 'rgb(var(--color-primary))',
              }}
            />
          )}

          <Icon size={18} style={{ flexShrink: 0 }} />

          {!collapsed && (
            <>
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
              {item.badge && (
                <span className="badge badge-pro" style={{ marginLeft: 'auto' }}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className="app-sidebar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        background: 'rgb(var(--bg-surface))',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          height: 'var(--appbar-height)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: 'rgb(var(--bg-elevated))',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <Image src={brand.logoPath} alt={brand.name} width={24} height={24} style={{ objectFit: 'contain' }} />
        </div>

        {!collapsed && (
          <span
            className="gradient-text"
            style={{
              fontWeight: 700,
              fontSize: 'var(--font-md)',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.02em',
            }}
          >
            {brand.name}
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {isSuperadmin
            ? superadminNavItems.map(renderNavItem)
            : (
              <>
                {/* Primary items (max 6) */}
                {filteredPrimaryNavItems.map(renderNavItem)}

                {/* "Lainnya" collapsed section for secondary items */}
                {filteredSecondaryNavItems.length > 0 && (
                  <li>
                    <button
                      onClick={() => setLainnyaOpen(!lainnyaOpen)}
                      title={collapsed ? 'Lainnya' : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        width: '100%',
                        padding: collapsed ? '0.6rem' : '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: isOnSecondaryPage ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
                        transition: 'var(--transition-fast)',
                        fontFamily: 'inherit',
                        marginTop: '0.5rem',
                      }}
                    >
                      <ChevronDown
                        size={18}
                        style={{
                          flexShrink: 0,
                          transform: (lainnyaOpen || isOnSecondaryPage) ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                      {!collapsed && (
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Lainnya
                        </span>
                      )}
                    </button>

                    {/* Secondary items - shown when expanded or user is on a secondary page */}
                    {(lainnyaOpen || isOnSecondaryPage) && (
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                        {filteredSecondaryNavItems.map(renderNavItem)}
                      </ul>
                    )}
                  </li>
                )}
              </>
            )
          }
        </ul>
      </nav>

      {/* Billing CTA - subtle prompt for users to discover billing */}
      {!collapsed && !isSuperadmin && pathname !== '/billing' && (
        <Link
          href="/billing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0 0.5rem 0.5rem',
            padding: '0.6rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(var(--color-primary) / 0.08) 0%, rgba(var(--color-accent-purple, var(--color-primary)) / 0.05) 100%)',
            border: '1px solid rgba(var(--color-primary) / 0.15)',
            textDecoration: 'none',
            transition: 'var(--transition-fast)',
          }}
        >
          <CreditCard size={14} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgb(var(--text-primary))', display: 'block' }}>Upgrade Plan ✨</span>
            <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))', display: 'block' }}>Buka fitur premium & kuota AI</span>
          </div>
        </Link>
      )}

      {/* Bottom section */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.5rem' }}>
        {/* XP Bar */}
        <div style={{ marginBottom: '0.5rem' }}>
          <XpBar collapsed={collapsed} />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            width: '100%',
            padding: collapsed ? '0.6rem' : '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgb(var(--text-secondary))',
            transition: 'var(--transition-fast)',
            fontFamily: 'inherit',
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && (
            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 400 }}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* Settings */}
        {(() => {
          const SettingsIcon = settingsNavItem.icon;
          const isSettingsActive = pathname === settingsNavItem.path || pathname?.startsWith(settingsNavItem.path + '/');
          return (
            <Link
              href={settingsNavItem.path}
              title={collapsed ? settingsNavItem.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: collapsed ? '0.6rem' : '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                justifyContent: collapsed ? 'center' : 'flex-start',
                textDecoration: 'none',
                position: 'relative',
                background: isSettingsActive ? 'rgba(var(--color-primary) / 0.1)' : 'transparent',
                transition: 'var(--transition-fast)',
                color: isSettingsActive ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
              }}
            >
              {isSettingsActive && (
                <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: '55%', borderRadius: '0 3px 3px 0', background: 'rgb(var(--color-primary))' }} />
              )}
              <SettingsIcon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: isSettingsActive ? 600 : 400, whiteSpace: 'nowrap' }}>
                  {settingsNavItem.label}
                </span>
              )}
            </Link>
          );
        })()}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '0.6rem',
            width: '100%',
            marginTop: '2px',
            padding: collapsed ? '0.6rem' : '0.5rem 0.75rem',
            background: 'none',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'rgb(var(--text-muted))',
            transition: 'var(--transition-fast)',
            fontFamily: 'inherit',
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span style={{ fontSize: 'var(--font-sm)' }}>Perkecil</span>}
        </button>
      </div>
    </aside>
  );
}
