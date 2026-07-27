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

import { LoginPage } from './components/LoginPage';
import { supabase } from './lib/supabase';

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [activeTheme, setActiveTheme] = useState<ThemeId>('ivory');
  const [impersonatedTenant, setImpersonatedTenant] = useState<SaaSTenant | null>(null);

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


  const [superAdminEmails] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_superadmins_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map((sa: any) => (sa.email || sa).toLowerCase());
      }
    } catch (e) {
      console.error(e);
    }
    return ['admin@osgbsistem.com', 'ovardar@gmail.com', 'orhan.vardar@gmail.com'];
  });


  const currentUserEmail = session?.user?.email || 'ovardar@gmail.com';

  const isSuperAdmin = useMemo(() => {
    return superAdminEmails.includes(currentUserEmail.toLowerCase());
  }, [superAdminEmails, currentUserEmail]);

  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);


  useEffect(() => {
    try {
      localStorage.setItem('crm_customers_v2', JSON.stringify(customers));
    } catch (e) {
      console.error(e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem('crm_contracts_v3', JSON.stringify(contracts));
    } catch (e) {
      console.error(e);
    }
  }, [contracts]);

  // Re-sync contracts & offers from localStorage when switching pages
  useEffect(() => {
    try {
      const storedContracts = localStorage.getItem('crm_contracts_v3');
      if (storedContracts) {
        const parsed = JSON.parse(storedContracts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setContracts(parsed);
        }
      }
      const storedOffers = localStorage.getItem('crm_offers_v3');
      if (storedOffers) {
        const parsedOff = JSON.parse(storedOffers);
        if (Array.isArray(parsedOff)) {
          setOffers(parsedOff);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeSection]);

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
            onImpersonateTenant={(tenant) => {
              setImpersonatedTenant(tenant);
              handleSectionChange('customers');
            }}
            onNavigateSection={handleSectionChange}
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
            impersonatedTenant={impersonatedTenant}
          />
        );
      case 'contracts':
        return (
          <ContractsPage
            contracts={contracts}
            setContracts={setContracts}
            customers={customers}
            offers={offers}
            impersonatedTenant={impersonatedTenant}
          />
        );

      case 'documents':
        return <DocumentsPage customers={customers} contracts={contracts} />;
      case 'price-lists':
        return <PriceListsPage />;
      case 'permissions':
        return <PermissionsPage impersonatedTenant={impersonatedTenant} isSuperAdmin={isSuperAdmin} />;
      case 'settings':
        return (
          <SettingsPage
            activeTheme={activeTheme}
            onThemeChange={setActiveTheme}
            isSuperAdmin={isSuperAdmin}
            impersonatedTenant={impersonatedTenant}
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
            impersonatedTenant={impersonatedTenant}
            customers={customers}
            offers={offers}
            contracts={contracts}
            onNavigateSection={handleSectionChange}
            onNavigateCustomer={handleNavigateCustomer}
          />
        );
    }
  }, [activeSection, activeTheme, customers, offers, contracts, selectedCustomerName]);

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
    return <LoginPage onLoginSuccess={(email) => setSession({ user: { email } })} />;
  }

  return (
    <Shell
      activeSection={activeSection}
      activeTheme={activeTheme}
      onSectionChange={handleSectionChange}
      isSuperAdmin={isSuperAdmin}
      activeTenantName={impersonatedTenant ? impersonatedTenant.companyName : undefined}
      activeTenantLogo={impersonatedTenant ? impersonatedTenant.logoUrl : undefined}
      onClearImpersonation={() => setImpersonatedTenant(null)}
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
  );
}

export default App;
