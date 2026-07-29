import { useEffect, useMemo, useState } from 'react';

import { ContractsPage } from './components/pages/ContractsPage';
import { CustomersPage, type CustomerActivity, type CustomerRecord } from './components/pages/CustomersPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { DocumentsPage } from './components/pages/DocumentsPage';
import { OffersPage } from './components/pages/OffersPage';
import { PermissionsPage } from './components/pages/PermissionsPage';
import { PriceListsPage } from './components/pages/PriceListsPage';
import { SaaSAdminPage } from './components/pages/SaaSAdminPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { Shell } from './components/Shell';
import { contractSeeds } from './data/contractSeeds';
import { customerSeeds } from './data/workbench';
import { sections } from './data/navigation';
import { offerSeeds } from './data/workbench';
import type { SectionId, SaaSTenant, ThemeId, ContractRecord, OfferRecord } from './types';
import { initialSaaSTenants } from './data/saasWorkbench';
import { LoginPage } from './components/LoginPage';
import { SetPasswordModal } from './components/modals/SetPasswordModal';
import { supabase } from './lib/supabase';
import { fetchCloudCustomers, saveCloudCustomers, fetchCloudOffers, saveCloudOffers, fetchCloudContracts, saveCloudContracts, fetchCloudTenants, subscribeToCloudDb } from './lib/cloudDb';


function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [impersonatedTenantId, setImpersonatedTenantId] = useState<string | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [activeInviteCode, setActiveInviteCode] = useState<string | undefined>(undefined);

  // Dynamic URL Invite Parameter Detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite') || params.get('token') || params.get('code');
    if (code) {
      setActiveInviteCode(code);
      setInviteModalOpen(true);
    }
  }, []);


  const [session, setSession] = useState<any>(() => {
    const savedUser = localStorage.getItem('crm_user_session');
    return savedUser ? { user: { email: savedUser } } : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        localStorage.setItem('crm_user_session', session.user.email || '');
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        localStorage.setItem('crm_user_session', session.user.email || '');
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Forced one-time purge of legacy browser state to clean production deployment
  useEffect(() => {
    if (!localStorage.getItem('crm_prod_clean_v5')) {
      const legacyKeysToReset = [
        'crm_user_session',
        'crm_customers_v2',
        'crm_offers_v3',
        'crm_contracts_v3',
        'crm_documents_v2',
        'crm_saas_tenants_v3',
        'crm_saas_offers_v3',
        'crm_saas_contracts_v3',
        'crm_saas_invoices_v3',
        'crm_saas_email_templates_v3',
        'crm_superadmins_v2',
        'crm_tenant_users_map_v2'
      ];

      legacyKeysToReset.forEach((key) => localStorage.removeItem(key));
      localStorage.setItem('crm_prod_clean_v5', 'true');
      setSession(null);
      setCustomers([]);
      setOffers([]);
      setContracts([]);
    }
  }, []);



  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    try {
      const saved = localStorage.getItem('crm_customers_v2');
      return saved ? JSON.parse(saved) : (customerSeeds as CustomerRecord[]);
    } catch {
      return customerSeeds as CustomerRecord[];
    }
  });

  const [offers, setOffers] = useState<OfferRecord[]>(() => {
    try {
      const saved = localStorage.getItem('crm_offers_v3');
      return saved ? JSON.parse(saved) : offerSeeds;
    } catch {
      return offerSeeds;
    }
  });

  const [contracts, setContracts] = useState<ContractRecord[]>(() => {
    try {
      const saved = localStorage.getItem('crm_contracts_v3');
      return saved ? JSON.parse(saved) : contractSeeds;
    } catch {
      return contractSeeds;
    }
  });


  const [superAdminEmails] = useState<string[]>(['orhan.vardar@gmail.com']);

  const [tenants, setTenants] = useState<SaaSTenant[]>(() => {
    try {
      const saved = localStorage.getItem('crm_saas_tenants_v3');
      return saved ? JSON.parse(saved) : initialSaaSTenants;
    } catch {
      return initialSaaSTenants;
    }
  });

  useEffect(() => {
    fetchCloudTenants(initialSaaSTenants).then((list) => {
      if (list && list.length > 0) setTenants(list);
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'crm_saas_tenants_v3' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTenants(parsed);
          }
        } catch (err) {
          console.warn('[App] Storage sync error for tenants:', err);
        }
      }
    };
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('crm_saas_tenant_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'TENANTS_UPDATED' && Array.isArray(event.data.tenants)) {
          setTenants(event.data.tenants);
        }
      };
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        bc.close();
      };
    }

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [activeTheme, setActiveTheme] = useState<ThemeId>('ivory');

  const impersonatedTenant = useMemo(() => {
    if (!impersonatedTenantId) return null;
    return tenants.find((t) => t.id === impersonatedTenantId) || null;
  }, [impersonatedTenantId, tenants]);




  const currentUserEmail = session?.user?.email || localStorage.getItem('crm_user_session') || '';

  const isSuperAdmin = useMemo(() => {
    if (!currentUserEmail) return false;
    const email = currentUserEmail.toLowerCase().trim();
    const hardcodedAdmins = ['orhan.vardar@gmail.com'];
    return hardcodedAdmins.includes(email) || superAdminEmails.includes(email);
  }, [superAdminEmails, currentUserEmail]);


  // Default initial page routing based on user authority
  useEffect(() => {
    if (session) {
      if (isSuperAdmin && !impersonatedTenant) {
        setActiveSection('saas-admin');
      } else if (!isSuperAdmin) {
        setActiveSection('dashboard');
      }
    }
  }, [session, isSuperAdmin, impersonatedTenant]);

  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);



  // Cloud DB Initial Fetch & Real-Time Sync
  useEffect(() => {
    async function initCloudData() {
      const dbCust = await fetchCloudCustomers(customerSeeds as CustomerRecord[]);
      setCustomers(dbCust);

      const dbOff = await fetchCloudOffers(offerSeeds);
      setOffers(dbOff);

      const dbCont = await fetchCloudContracts(contractSeeds);
      setContracts(dbCont);

      const dbTenants = await fetchCloudTenants(initialSaaSTenants);
      if (dbTenants && dbTenants.length > 0) setTenants(dbTenants);
    }
    initCloudData();

    // Supabase Real-Time Channel for cross-browser sync
    const channel = supabase
      .channel('realtime-crm-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, async () => {
        const updated = await fetchCloudCustomers();
        setCustomers(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, async () => {
        const updated = await fetchCloudOffers();
        setOffers(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, async () => {
        const updated = await fetchCloudContracts();
        setContracts(updated);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, async () => {
        const updated = await fetchCloudTenants(initialSaaSTenants);
        if (updated && updated.length > 0) setTenants(updated);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Save changes to Cloud DB & local storage
  useEffect(() => {
    saveCloudCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveCloudOffers(offers);
  }, [offers]);

  useEffect(() => {
    saveCloudContracts(contracts);
  }, [contracts]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('offer-contract-theme') as ThemeId | null;

    if (savedTheme) {
      setActiveTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    window.localStorage.setItem('offer-contract-theme', activeTheme);
  }, [activeTheme]);

  const handleUpdateActivityStatus = (customerName: string, activityId: string, newStatus: CustomerActivity['status']) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.name !== customerName) return c;
        const updatedList = (c.activitiesList || []).map((act) =>
          act.id === activityId ? { ...act, status: newStatus } : act
        );
        return { ...c, activitiesList: updatedList };
      })
    );
  };

  const handleNavigateCustomer = (name: string) => {
    setSelectedCustomerName(name);
    setActiveSection('customers');
  };

  const handleSectionChange = (section: SectionId) => {
    setSelectedCustomerName(null);
    setActiveSection(section);
  };

  const handleAddContractFromOffer = (newContract: ContractRecord) => {
    setContracts((prev) => [newContract, ...prev]);
  };

  const currentTenant = useMemo(() => {
    if (impersonatedTenant) return impersonatedTenant;
    if (isSuperAdmin) return null;

    const getFreshLogo = (targetTenant: SaaSTenant) => {
      if (targetTenant.logoUrl) return targetTenant.logoUrl;
      try {
        const saved = localStorage.getItem('crm_saas_tenants_v3');
        if (saved) {
          const list: SaaSTenant[] = JSON.parse(saved);
          const found = list.find(
            (t) =>
              t.logoUrl &&
              (t.id === targetTenant.id ||
                (t.companyName && targetTenant.companyName && t.companyName.trim().toLowerCase() === targetTenant.companyName.trim().toLowerCase()) ||
                t.tenantCode === targetTenant.tenantCode)
          );
          if (found?.logoUrl) return found.logoUrl;
        }
      } catch (e) {
        console.warn(e);
      }
      return undefined;
    };

    const userEmailClean = (currentUserEmail || '').trim().toLowerCase();
    let target: SaaSTenant | null = null;

    if (tenants.length > 0) {
      const byEmail = tenants.find((t) => t.email && t.email.trim().toLowerCase() === userEmailClean);
      if (byEmail) {
        target = byEmail;
      } else {
        const byContact = tenants.find((t) => t.contactName && t.contactName.trim().toLowerCase() === userEmailClean);
        if (byContact) {
          target = byContact;
        } else {
          const byCompany = tenants.find((t) => t.companyName && t.companyName.toLowerCase().includes('test osgb'));
          target = byCompany || tenants[0];
        }
      }
    }

    if (!target) {
      try {
        const savedTenantsStr = localStorage.getItem('crm_saas_tenants_v3');
        if (savedTenantsStr) {
          const tenantsList: SaaSTenant[] = JSON.parse(savedTenantsStr);
          if (tenantsList.length > 0) {
            const byEmail = tenantsList.find((t) => t.email && t.email.trim().toLowerCase() === userEmailClean);
            if (byEmail) {
              target = byEmail;
            } else {
              const byCompany = tenantsList.find((t) => t.companyName && t.companyName.toLowerCase().includes('test osgb'));
              target = byCompany || tenantsList[0];
            }
          }
        }
      } catch (e) {
        console.warn('[App] Error finding current tenant:', e);
      }
    }

    if (target) {
      const freshLogo = getFreshLogo(target);
      return freshLogo ? { ...target, logoUrl: freshLogo } : target;
    }

    return null;
  }, [impersonatedTenant, currentUserEmail, isSuperAdmin, tenants]);

  const activeMeta = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection]
  );

  const content = useMemo(() => {
    switch (activeSection) {
      case 'saas-admin':
        if (!isSuperAdmin || impersonatedTenant) {
          return (
            <div className="panel panel-wide panel-elevated" style={{ padding: 40, textAlign: 'center' }}>
              <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: 12 }}>⛔</span>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: '#ef4444' }}>403 Yetkisiz Erişim</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 550, marginInline: 'auto' }}>
                SaaS Yönetimi paneline yalnızca sistem sahibi Süper Admin kullanıcılar erişebilir. Kiracı müşterilerin veya yetkisiz kullanıcıların bu sayfayı görüntüleme yetkisi bulunmamaktadır.
              </p>
              <button
                type="button"
                className="btn-action-primary"
                style={{ marginTop: 20, padding: '10px 24px' }}
                onClick={() => handleSectionChange('dashboard')}
              >
                ← Ana Sayfaya Dön
              </button>
            </div>
          );
        }
        return (
          <SaaSAdminPage
            currentUserEmail={currentUserEmail}
            onImpersonateTenant={(tenant) => {
              setImpersonatedTenantId(tenant.id);
              handleSectionChange('customers');
            }}
            onNavigateSection={handleSectionChange}
            tenants={tenants}
            setTenants={setTenants}
          />

        );
      case 'customers':
        return (
          <CustomersPage
            customers={customers}
            setCustomers={setCustomers}
            selectedCustomerName={selectedCustomerName}
            onSelectCustomerName={setSelectedCustomerName}
          />
        );
      case 'offers':
        return (
          <OffersPage
            customers={customers}
            onContractCreated={handleAddContractFromOffer}
            onNavigateToContracts={() => handleSectionChange('contracts')}
            impersonatedTenant={impersonatedTenant || currentTenant}
          />
        );
      case 'contracts':
        return (
          <ContractsPage
            contracts={contracts}
            setContracts={setContracts}
            customers={customers}
            offers={offers}
            impersonatedTenant={impersonatedTenant || currentTenant}
          />
        );

      case 'documents':
        return <DocumentsPage customers={customers} contracts={contracts} />;
      case 'price-lists':
        return <PriceListsPage />;
      case 'permissions':
        return <PermissionsPage impersonatedTenant={impersonatedTenant || currentTenant} isSuperAdmin={isSuperAdmin} />;
      case 'settings':
        return (
          <SettingsPage
            activeTheme={activeTheme}
            onThemeChange={setActiveTheme}
            isSuperAdmin={isSuperAdmin}
            impersonatedTenant={impersonatedTenant || currentTenant}
            customers={customers}
            setCustomers={setCustomers}
            offers={offers}
            setOffers={setOffers}
            contracts={contracts}
            setContracts={setContracts}
          />
        );
      case 'dashboard':
      default:
        return (
          <DashboardPage
            impersonatedTenant={impersonatedTenant || currentTenant}
            currentUserEmail={currentUserEmail}
            customers={customers}
            offers={offers}
            contracts={contracts}
            onNavigateSection={handleSectionChange}
            onNavigateCustomer={handleNavigateCustomer}
          />
        );
    }
  }, [activeSection, activeTheme, customers, offers, contracts, selectedCustomerName, isSuperAdmin, impersonatedTenant, currentTenant, currentUserEmail]);


  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090d16',
        color: '#94a3b8',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚡</div>
          <div>Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <SetPasswordModal
          isOpen={inviteModalOpen}
          inviteCode={activeInviteCode}
          onClose={() => {
            setInviteModalOpen(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
          onSuccess={() => {
            setInviteModalOpen(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
        <LoginPage onLoginSuccess={(email) => setSession({ user: { email } })} />
      </>
    );
  }

  return (
    <>
      <SetPasswordModal
        isOpen={inviteModalOpen}
        inviteCode={activeInviteCode}
        onClose={() => {
          setInviteModalOpen(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
        onSuccess={() => {
          setInviteModalOpen(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
      <Shell
        activeSection={activeSection}
        activeTheme={activeTheme}
        onSectionChange={handleSectionChange}
        isSuperAdmin={isSuperAdmin}
        currentUserEmail={currentUserEmail}
        activeTenantName={currentTenant ? currentTenant.companyName : undefined}
        activeTenantContactName={currentTenant ? currentTenant.contactName : undefined}
        activeTenantLogo={currentTenant ? currentTenant.logoUrl : undefined}
        onClearImpersonation={impersonatedTenantId ? () => setImpersonatedTenantId(null) : undefined}
        customers={customers}
        onUpdateActivityStatus={handleUpdateActivityStatus}
        onNavigateCustomer={handleNavigateCustomer}
        title={
          activeSection === 'saas-admin'
            ? 'Yazılım Firması SaaS Yönetim ve Lisans Paneli'
            : impersonatedTenant
            ? `[${impersonatedTenant.companyName}] Kiracı Modunda İnceleme`
            : undefined
        }
        subtitle={
          activeSection === 'saas-admin'
            ? 'Kendi SaaS müşterilerinizi, lisanslarınızı, paketlerinizi ve abonelik sözleşmelerinizi buradan takip edin.'
            : impersonatedTenant
            ? `Bu ekran ${impersonatedTenant.companyName} firmanızın kendi müşterilerine sunduğu teklif ve sözleşme CRM alanıdır.`
            : undefined
        }
        sidebarNoteTitle={activeMeta.label}
        sidebarNoteBody={activeMeta.description}
      >
        {content}
      </Shell>
    </>
  );
}


export default App;

