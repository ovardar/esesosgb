import type { ReactNode } from 'react';

import { NotificationBell } from './NotificationBell';
import type { CustomerActivity, CustomerRecord } from './pages/CustomersPage';
import { sections } from '../data/navigation';
import type { SectionId, ThemeId } from '../types';

type ShellProps = {
  activeSection: SectionId;
  activeTheme: ThemeId;
  onSectionChange: (section: SectionId) => void;
  isSuperAdmin?: boolean;
  activeTenantName?: string;
  activeTenantLogo?: string;
  onClearImpersonation?: () => void;
  title?: string;
  subtitle?: string;
  sidebarNoteTitle?: string;
  sidebarNoteBody?: string;
  customers?: CustomerRecord[];
  onUpdateActivityStatus?: (customerName: string, activityId: string, newStatus: CustomerActivity['status']) => void;
  onNavigateCustomer?: (customerName: string) => void;
  children: ReactNode;
};

export function Shell({
  activeSection,
  activeTheme,
  onSectionChange,
  isSuperAdmin = true,
  activeTenantName,
  activeTenantLogo,
  onClearImpersonation,
  title,
  subtitle,
  sidebarNoteTitle,
  sidebarNoteBody,
  customers = [],
  onUpdateActivityStatus = () => {},
  onNavigateCustomer = () => {},
  children
}: ShellProps) {
  const visibleSections = sections.filter((sec) => {
    if (isSuperAdmin && !activeTenantName) {
      // Superadmin in SaaS mode sees ONLY SaaS Yönetimi
      return sec.id === 'saas-admin';
    }
    // Regular customer user or Superadmin in impersonation mode sees OSGB sections
    return sec.id !== 'saas-admin';
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          {activeTenantLogo ? (
            <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: '#ffffff', padding: 3, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={activeTenantLogo} alt={activeTenantName || 'Kiracı Logosu'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <span className="brand-mark">OC</span>
          )}
          <div>
            <p className="eyebrow" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeTenantName ? activeTenantName : 'SaaS Workspace'}
            </p>
            <h1 style={{ fontSize: '0.98rem' }}>{activeTenantName ? 'İSG Yönetim Portalı' : 'Offer & Contract'}</h1>
          </div>
        </div>

        {activeTenantName && (
          <div className="impersonation-badge-sidebar" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 12, borderRadius: 10, marginBottom: 12 }}>
            <span className="eyebrow text-amber" style={{ color: '#b45309', fontWeight: 700 }}>● Kiracı Modu Aktif</span>
            <strong className="block text-xs truncate" style={{ fontSize: '0.82rem', display: 'block', margin: '2px 0' }}>{activeTenantName}</strong>
            <button
              className="link-btn text-2xs text-muted mt-1"
              style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.75rem', padding: 0, fontWeight: 600 }}
              onClick={() => {
                if (onClearImpersonation) onClearImpersonation();
                onSectionChange('saas-admin');
              }}
            >
              ← SaaS Yönetimine Dön
            </button>
          </div>
        )}

        <nav className="sidebar-nav" aria-label="Ana menü">
          {visibleSections.map((section) => (
            <button
              key={section.id}
              className={section.id === activeSection ? 'nav-item nav-item-active' : 'nav-item'}
              onClick={() => onSectionChange(section.id)}
            >
              <span className="nav-title">{section.label}</span>
              <span className="nav-subtitle">{section.description}</span>
            </button>
          ))}
        </nav>

        {sidebarNoteTitle && (
          <div className="sidebar-card">
            <p className="eyebrow">Bölüm Detayı</p>
            <strong>{sidebarNoteTitle}</strong>
            <p>{sidebarNoteBody}</p>
          </div>
        )}

        <div className="sidebar-card sidebar-card-small" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <p className="eyebrow" style={{ color: '#047857', fontWeight: 700 }}>● SaaS Cloud Sunucu</p>
          <strong style={{ color: '#065f46', fontSize: '0.84rem', display: 'block', margin: '2px 0' }}>🟢 Tüm Servisler Çalışıyor</strong>
          <p style={{ margin: 0, fontSize: '0.74rem', color: '#047857' }}>SSL Güvenli • %99.9 Uptime</p>
        </div>
      </aside>

      <main className="workspace">
        <header style={{ display: 'flex', justifyContent: (title || subtitle) ? 'space-between' : 'flex-end', alignItems: 'center', marginBottom: (title || subtitle) ? 20 : 12, flexWrap: 'wrap', gap: 12 }}>
          {(title || subtitle) ? (
            <div>
              {title && (
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                  {title}
                </h2>
              )}
              {subtitle && <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
            </div>
          ) : null}

          <NotificationBell
            customers={customers}
            onUpdateActivityStatus={onUpdateActivityStatus}
            onNavigateCustomer={onNavigateCustomer}
            onNavigateSection={onSectionChange}
          />
        </header>

        {children}
      </main>
    </div>
  );
}
