import { useMemo, type ReactNode } from 'react';

import { NotificationBell } from './NotificationBell';
import type { CustomerActivity, CustomerRecord } from './pages/CustomersPage';
import { sections } from '../data/navigation';
import { supabase } from '../lib/supabase';
import type { SectionId, ThemeId } from '../types';
import { resolveUserRoleInfo } from '../lib/userRoles';
import { CODENTRA_LOGO_DATA_URI } from '../assets/logoDataUri';


type ShellProps = {
  activeSection: SectionId;
  activeTheme: ThemeId;
  onSectionChange: (section: SectionId) => void;
  isSuperAdmin?: boolean;
  currentUserEmail?: string;
  activeTenant?: import('../types').SaaSTenant;
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
  currentUserEmail,
  activeTenant,
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
  const activeTenantName = activeTenant?.companyName;
  const activeTenantContactName = activeTenant?.contactName;
  const activeTenantLogo = activeTenant?.logoUrl;
  const isDemoUser = activeTenant?.status === 'Demo';

  const visibleSections = sections.filter((sec) => {
    if (isSuperAdmin && !activeTenantName) {
      // Superadmin in SaaS mode sees ONLY SaaS Yönetimi
      return sec.id === 'saas-admin';
    }
    // Regular customer user or Superadmin in impersonation mode sees OSGB sections
    return sec.id !== 'saas-admin';
  });

  const userRole = useMemo(() => {
    return resolveUserRoleInfo(
      currentUserEmail,
      isSuperAdmin,
      activeTenantName ? ({ companyName: activeTenantName, contactName: activeTenantContactName, logoUrl: activeTenantLogo } as any) : null
    );
  }, [currentUserEmail, isSuperAdmin, activeTenantName, activeTenantContactName, activeTenantLogo]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" style={{ padding: '6px 0', marginBottom: 20 }}>
          {activeTenantLogo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', background: '#ffffff', padding: 4, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(0, 0, 0, 0.08)' }}>
                <img src={activeTenantLogo} alt={activeTenantName || 'Kiracı Logosu'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <p className="eyebrow" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: 0, fontWeight: 700 }}>
                  {activeTenantName}
                </p>
                <h1 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Teklif ve Sözleşme Yazılımı</h1>
              </div>
            </div>
          ) : activeTenantName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#ffffff', fontSize: '1.05rem', fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(14, 165, 233, 0.3)' }}>
                {activeTenantName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="eyebrow" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0ea5e9', margin: 0, fontWeight: 800 }}>
                  {activeTenantName}
                </p>
                <h1 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Teklif ve Sözleşme Yazılımı</h1>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <img
                src={CODENTRA_LOGO_DATA_URI}
                alt="Codentra Logo"
                style={{
                  height: 75,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25))'
                }}
              />
            </div>
          )}
        </div>

        {onClearImpersonation && activeTenantName && (
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
      </aside>

      <main className="workspace">
        {isDemoUser && (
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>⏱️</span>
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem' }}>Demo Sürümündesiniz</strong>
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Süreniz bitene kadar tüm özellikleri kesintisiz kullanabilirsiniz.
                </span>
              </div>
            </div>
            <button 
              onClick={() => {
                window.location.hash = 'billing';
                onSectionChange('settings');
              }}
              style={{
                background: '#ffffff',
                color: '#d97706',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
            >
              🚀 Aboneliği Başlat
            </button>
          </div>
        )}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {currentUserEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'var(--surface-strong)', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-main)', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)' }}>
                <span style={{ fontSize: '0.88rem' }}>👤</span>
                <span style={{ fontWeight: 600 }}>{currentUserEmail}</span>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, background: userRole.badgeBg, color: userRole.badgeColor, fontWeight: 700 }}>
                  {userRole.badgeLabel}
                </span>
              </div>
            )}
            <NotificationBell
              customers={customers}
              onUpdateActivityStatus={onUpdateActivityStatus}
              onNavigateCustomer={onNavigateCustomer}
              onNavigateSection={onSectionChange}
            />

            <button
              type="button"
              className="btn-action-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
              onClick={async () => {
                localStorage.removeItem('crm_user_session');
                await supabase.auth.signOut();
                window.location.reload();
              }}
              title="Oturumu Kapat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Çıkış</span>
            </button>
          </div>
        </header>

        {children}

      </main>
    </div>
  );
}
