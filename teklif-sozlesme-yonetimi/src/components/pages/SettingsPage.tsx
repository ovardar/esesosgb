import { useMemo, useState } from 'react';

import { themes } from '../../data/theme';
import type { ContractRecord, OfferRecord, SaaSTenant, ThemeId } from '../../types';
import type { CustomerRecord } from './CustomersPage';
import { PermissionsPage } from './PermissionsPage';
import { TenantTemplatesTab } from './TenantTemplatesTab';
import { ImportExportTab } from './ImportExportTab';
import { BillingTab } from './BillingTab';
import { resolveUserRoleInfo } from '../../lib/userRoles';

type SettingsPageProps = {
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  isSuperAdmin?: boolean;
  impersonatedTenant?: SaaSTenant | null;
  customers: CustomerRecord[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRecord[]>>;
  offers: OfferRecord[];
  setOffers: React.Dispatch<React.SetStateAction<OfferRecord[]>>;
  contracts: ContractRecord[];
  setContracts: React.Dispatch<React.SetStateAction<ContractRecord[]>>;
};

export function SettingsPage({
  activeTheme,
  onThemeChange,
  isSuperAdmin = true,
  impersonatedTenant,
  customers,
  setCustomers,
  offers,
  setOffers,
  contracts,
  setContracts
}: SettingsPageProps) {
  // Sistem Ayarları Ana Sekmesi
  const [activeTab, setActiveTab] = useState<'users-permissions' | 'templates' | 'theme' | 'import-export' | 'billing'>(() => {
    const hash = window.location.hash.replace('#', '');
    if (['users-permissions', 'templates', 'theme', 'import-export', 'billing'].includes(hash)) {
      return hash as any;
    }
    return 'users-permissions';
  });

  const handleTabChange = (tab: 'users-permissions' | 'templates' | 'theme' | 'import-export' | 'billing') => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const currentUserEmail = localStorage.getItem('crm_user_session') || '';
  const userRole = useMemo(() => resolveUserRoleInfo(currentUserEmail, isSuperAdmin, impersonatedTenant), [currentUserEmail, isSuperAdmin, impersonatedTenant]);
  
  const showBillingTab = userRole.isTenantAdmin;

  const activeThemeMeta = useMemo(() => themes.find((theme) => theme.id === activeTheme) ?? themes[0], [activeTheme]);

  const lightThemes = useMemo(() => themes.filter((t) => t.mode === 'light'), []);
  const darkThemes = useMemo(() => themes.filter((t) => t.mode === 'dark'), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ACCENT-MATCHING COMMAND BANNER FOR SISTEM AYARLARI */}
      <article
        style={{
          background: 'var(--accent)',
          border: '1px solid var(--accent)',
          padding: '18px 24px',
          borderRadius: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: 'var(--shadow)',
          backdropFilter: 'blur(16px)',
          color: '#ffffff'
        }}
      >
        {/* TOP ROW: BRANDING & ADMIN BADGE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.25)',
              border: '1.5px solid rgba(255, 255, 255, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              color: '#ffffff',
              boxSizing: 'border-box'
            }}>
              ⚙️
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 800 }}>
                SİSTEM YÖNETİMİ & TERCİHLER
              </span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                Sistem Ayarları & Yetkiler
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                height: 38,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.25)',
                border: '1.5px solid rgba(255, 255, 255, 0.45)',
                borderRadius: 10,
                padding: '0 14px',
                fontSize: '0.84rem',
                fontWeight: 700,
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                boxSizing: 'border-box'
              }}
            >
              🔒 Admin Yetkisi Aktif
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: FROSTED GLASS TAB SELECTOR BUTTONS */}
        <div style={{ display: 'flex', gap: 10, borderTop: '1px solid rgba(255, 255, 255, 0.25)', paddingTop: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleTabChange('users-permissions')}
            style={{
              height: 38,
              padding: '0 18px',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'users-permissions' ? 800 : 600,
              color: '#ffffff',
              background: activeTab === 'users-permissions' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.16)',
              border: activeTab === 'users-permissions' ? '1.5px solid rgba(255, 255, 255, 0.65)' : '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: activeTab === 'users-permissions' ? '0 2px 8px rgba(0, 0, 0, 0.12)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            👥 Kullanıcılar ve Yetkiler
          </button>

          {showBillingTab && (
            <button
              type="button"
              onClick={() => handleTabChange('billing')}
              style={{
                height: 38,
                padding: '0 18px',
                fontSize: '0.86rem',
                fontWeight: activeTab === 'billing' ? 800 : 600,
                color: '#ffffff',
                background: activeTab === 'billing' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.16)',
                border: activeTab === 'billing' ? '1.5px solid rgba(255, 255, 255, 0.65)' : '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 10,
                cursor: 'pointer',
                boxShadow: activeTab === 'billing' ? '0 2px 8px rgba(0, 0, 0, 0.12)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              💳 Abonelik & Ödeme
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTabChange('templates')}
            style={{
              height: 38,
              padding: '0 18px',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'templates' ? 800 : 600,
              color: '#ffffff',
              background: activeTab === 'templates' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.16)',
              border: activeTab === 'templates' ? '1.5px solid rgba(255, 255, 255, 0.65)' : '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: activeTab === 'templates' ? '0 2px 8px rgba(0, 0, 0, 0.12)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            📑 Kurumsal Şablonlar
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('import-export')}
            style={{
              height: 38,
              padding: '0 18px',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'import-export' ? 800 : 600,
              color: '#ffffff',
              background: activeTab === 'import-export' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.16)',
              border: activeTab === 'import-export' ? '1.5px solid rgba(255, 255, 255, 0.65)' : '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: activeTab === 'import-export' ? '0 2px 8px rgba(0, 0, 0, 0.12)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            📦 Veri İçe / Dışa Aktarım (Yedekleme)
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('theme')}
            style={{
              height: 38,
              padding: '0 18px',
              fontSize: '0.86rem',
              fontWeight: activeTab === 'theme' ? 800 : 600,
              color: '#ffffff',
              background: activeTab === 'theme' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.16)',
              border: activeTab === 'theme' ? '1.5px solid rgba(255, 255, 255, 0.65)' : '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: activeTab === 'theme' ? '0 2px 8px rgba(0, 0, 0, 0.12)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            🎨 Tema Tercihleri ({activeThemeMeta.name})
          </button>
        </div>
      </article>

      {/* TAB 1: USERS & PERMISSIONS */}
      {activeTab === 'users-permissions' && (
        <PermissionsPage impersonatedTenant={impersonatedTenant} isSuperAdmin={isSuperAdmin} />
      )}

      {/* TAB 2: CORPORATE TEMPLATES */}
      {activeTab === 'templates' && (
        <TenantTemplatesTab impersonatedTenant={impersonatedTenant} />
      )}

      {/* TAB 2: IMPORT / EXPORT */}
      {activeTab === 'import-export' && (
        <ImportExportTab
          customers={customers}
          setCustomers={setCustomers}
          offers={offers}
          setOffers={setOffers}
          contracts={contracts}
          setContracts={setContracts}
        />
      )}

      {/* TAB 3: BILLING & SUBSCRIPTION */}
      {activeTab === 'billing' && showBillingTab && impersonatedTenant && (
        <BillingTab
          activeTenant={impersonatedTenant}
          onUpdateTenant={(t) => {
            // Update local state if needed (or just trigger sync)
            try {
              const bc = new BroadcastChannel('crm_saas_tenant_sync');
              bc.postMessage({ type: 'REFRESH' });
              bc.close();
            } catch (e) {}
          }}
        />
      )}

      {/* TAB 4: THEME SELECTION */}
      {activeTab === 'theme' && (
        <section className="panel panel-wide panel-elevated theme-settings-page">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Arayüz Tercihleri</p>
              <h3>Sistem Tema Paleti</h3>
            </div>
            <span className="mini-badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
              Aktif: {activeThemeMeta.name}
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20 }}>
            Çalışma ortamınıza ve göz konforunuza en uygun renk temasını seçin. Seçiminiz anında uygulanır ve tüm oturumlarınızda hatırlanır.
          </p>

          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 0', color: 'var(--text-main)' }}>☀️ Açık Renk Temaları (Light Modes)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {lightThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onThemeChange(theme.id)}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: activeTheme === theme.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: activeTheme === theme.id ? 'var(--accent-soft)' : 'var(--surface-strong)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{theme.name}</strong>
                    {activeTheme === theme.id && <span style={{ color: 'var(--accent)', fontWeight: 800 }}>✓ Seçili</span>}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{theme.summary}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px 0', color: 'var(--text-main)' }}>🌙 Koyu Renk Temaları (Dark & OLED Modes)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {darkThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onThemeChange(theme.id)}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: activeTheme === theme.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: activeTheme === theme.id ? 'var(--accent-soft)' : 'var(--surface-strong)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{theme.name}</strong>
                    {activeTheme === theme.id && <span style={{ color: 'var(--accent)', fontWeight: 800 }}>✓ Seçili</span>}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{theme.summary}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
