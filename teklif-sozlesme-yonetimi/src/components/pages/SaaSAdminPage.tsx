import { useEffect, useMemo, useState, useRef } from 'react';

import { createPortal } from 'react-dom';

import {
  initialSaaSContracts,
  initialSaaSEmailTemplates,
  initialSaaSInvoices,
  initialSaaSOffers,
  initialSaaSPackages,
  initialSaaSTenants
} from '../../data/saasWorkbench';
import type {
  SectionId,
  SaaSContract,
  SaaSEmailTemplate,
  SaaSInvoice,
  SaaSOffer,
  SaaSPackage,
  SaaSPackageDefinition,
  SaaSPaymentStatus,
  SaaSHealthStatus,
  SaaSTenant,
  SaaSSubscriptionStatus
} from '../../types';


import { sendEmail, buildCustomerInviteTemplate } from '../../lib/email';
import { supabase } from '../../lib/supabase';
import { fetchCloudTenants, saveCloudTenants, deleteCloudTenant } from '../../lib/cloudDb';

const resizeImageBase64 = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

type Props = {
  onImpersonateTenant?: (tenant: SaaSTenant) => void;
  onNavigateSection?: (section: SectionId) => void;
  currentUserEmail?: string;
  tenants?: SaaSTenant[];
  setTenants?: React.Dispatch<React.SetStateAction<SaaSTenant[]>>;
};
let lastLocalUpdate = 0;

export function SaaSAdminPage({ onImpersonateTenant, onNavigateSection, currentUserEmail, tenants: propTenants, setTenants: propSetTenants }: Props) {
  const activeUserEmail = currentUserEmail || localStorage.getItem('crm_user_session') || 'orhan.vardar@gmail.com';
  const [sendingEmail, setSendingEmail] = useState(false);
  const [internalTenants, setInternalTenants] = useState<SaaSTenant[]>(() => {
    try {
      const saved = localStorage.getItem('crm_saas_tenants_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialSaaSTenants;
  });

  const tenants = propTenants || internalTenants;
  const setTenants = propSetTenants || setInternalTenants;

  const [offers, setOffers] = useState<SaaSOffer[]>(() => {
    try {
      const saved = localStorage.getItem('crm_saas_offers_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialSaaSOffers;
  });

  const [contracts, setContracts] = useState<SaaSContract[]>(() => {
    try {
      const saved = localStorage.getItem('crm_saas_contracts_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialSaaSContracts;
  });

  const [packages, setPackages] = useState<SaaSPackageDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('crm_saas_packages_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialSaaSPackages;
  });

  const [invoices, setInvoices] = useState<SaaSInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('crm_saas_invoices_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialSaaSInvoices;
  });

  const [emailTemplates, setEmailTemplates] = useState<SaaSEmailTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('crm_saas_email_templates_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialSaaSEmailTemplates;
  });

  

  const initialOffersRender = useRef(true);
  useEffect(() => {
    if (initialOffersRender.current) {
      initialOffersRender.current = false;
      return;
    }
    try { localStorage.setItem('crm_saas_offers_v3', JSON.stringify(offers)); } catch (e) { console.error(e); }
  }, [offers]);

  useEffect(() => {
    try { localStorage.setItem('crm_saas_contracts_v3', JSON.stringify(contracts)); } catch (e) { console.error(e); }
  }, [contracts]);

  useEffect(() => {
    try { localStorage.setItem('crm_saas_packages_v3', JSON.stringify(packages)); } catch (e) { console.error(e); }
  }, [packages]);

  useEffect(() => {
    try { localStorage.setItem('crm_saas_invoices_v3', JSON.stringify(invoices)); } catch (e) { console.error(e); }
  }, [invoices]);

  useEffect(() => {
    try { localStorage.setItem('crm_saas_email_templates_v3', JSON.stringify(emailTemplates)); } catch (e) { console.error(e); }
  }, [emailTemplates]);

  // Supabase PostgreSQL Cloud Database & Real-Time Sync Effect
  useEffect(() => {
    // Use the proper cloudDb.ts fetchCloudTenants which preserves existing contact info
    const loadTenantsFromCloud = async (isInitial = false) => {
      if (!isInitial && Date.now() - lastLocalUpdate < 2000) return;
      try {
        const cloudTenants = await fetchCloudTenants();
        if (cloudTenants && cloudTenants.length > 0) {
          setTenants(cloudTenants);
        }
      } catch (e) {
        console.error('Supabase tenants fetch error:', e);
      }
    };

    loadTenantsFromCloud(true);

    const channel = supabase
      .channel('realtime-saas-tenants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        loadTenantsFromCloud(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // Main Section Tab ('tenants' | 'packages' | 'offers-contracts' | 'invoices' | 'email-templates' | 'super-admins')
  const [mainTab, setMainTab] = useState<'tenants' | 'packages' | 'offers-contracts' | 'invoices' | 'email-templates' | 'super-admins'>('tenants');

  // Superadmin Email Store
  const [superAdmins, setSuperAdmins] = useState<Array<{ id: string; email: string; name: string; addedAt: string }>>(() => {
    try {
      const saved = localStorage.getItem('crm_superadmins_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'sa-1', email: 'orhan.vardar@gmail.com', name: 'Orhan Vardar (Süper Admin)', addedAt: '2026-01-01' }
    ];
  });

  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState('');
  const [newSuperAdminName, setNewSuperAdminName] = useState('');
  const [superAdminInviteUser, setSuperAdminInviteUser] = useState<{ name: string; email: string } | null>(null);
  const [passwordSetupUser, setPasswordSetupUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    try {
      localStorage.setItem('crm_superadmins_v2', JSON.stringify(superAdmins));
    } catch (e) {
      console.error(e);
    }
  }, [superAdmins]);


  const handleAddSuperAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = newSuperAdminEmail.trim().toLowerCase();
    if (!emailClean) return;
    if (superAdmins.some((sa) => sa.email.toLowerCase() === emailClean)) {
      alert('Bu e-posta adresi zaten Süper Admin olarak ekli.');
      return;
    }

    const newSA = {
      id: `sa-${Date.now()}`,
      email: emailClean,
      name: newSuperAdminName.trim() || emailClean,
      addedAt: new Date().toISOString().split('T')[0]
    };

    setSuperAdmins((prev) => [...prev, newSA]);
    setNewSuperAdminEmail('');
    setNewSuperAdminName('');
    setSuperAdminInviteUser(newSA);
  };

  const handleRemoveSuperAdmin = (id: string, name: string) => {
    if (superAdmins.length <= 1) {
      alert('Sistemde en az 1 adet Süper Admin bulunmalıdır.');
      return;
    }
    if (window.confirm(`"${name}" kullanıcısının Süper Admin yetkisini kaldırmak istediğinize emin misiniz?`)) {
      setSuperAdmins((prev) => prev.filter((sa) => sa.id !== id));
    }
  };

  // Filters for Tenants
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [upsellOnlyFilter, setUpsellOnlyFilter] = useState<boolean>(false);
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState<string>('all');

  // Table Column Sort States
  type SortDir = 'asc' | 'desc';
  const [tenantSort, setTenantSort] = useState<{ field: string; dir: SortDir }>({ field: 'companyName', dir: 'asc' });
  const [offerSort, setOfferSort] = useState<{ field: string; dir: SortDir }>({ field: 'createdAt', dir: 'desc' });
  const [contractSort, setContractSort] = useState<{ field: string; dir: SortDir }>({ field: 'contractNumber', dir: 'asc' });
  const [invoiceSort, setInvoiceSort] = useState<{ field: string; dir: SortDir }>({ field: 'dueDate', dir: 'desc' });
  const [packageSort, setPackageSort] = useState<{ field: string; dir: SortDir }>({ field: 'name', dir: 'asc' });
  const [superAdminSort, setSuperAdminSort] = useState<{ field: string; dir: SortDir }>({ field: 'name', dir: 'asc' });

  const toggleSort = (
    currentSort: { field: string; dir: SortDir },
    setSort: React.Dispatch<React.SetStateAction<{ field: string; dir: SortDir }>>,
    field: string
  ) => {
    if (currentSort.field === field) {
      setSort({ field, dir: currentSort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ field, dir: 'asc' });
    }
  };

  // UI Modals & Drawers
  const [selectedTenant, setSelectedTenant] = useState<SaaSTenant | null>(null);
  const [editableTenant, setEditableTenant] = useState<SaaSTenant | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'license' | 'offers' | 'contracts' | 'billing' | 'modules' | 'notes' | 'users'>('info');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [activeInviteDialogInfo, setActiveInviteDialogInfo] = useState<{

    email: string;
    companyName: string;
    inviteLink: string;
    success: boolean;
  } | null>(null);


  // Client Offer Preview & Online Approval Simulation Modal
  const [previewOffer, setPreviewOffer] = useState<SaaSOffer | null>(null);

  // Email Template Editing Modal
  const [editingTemplate, setEditingTemplate] = useState<SaaSEmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ subject: '', body: '' });

  // Package Management Modals
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SaaSPackageDefinition | null>(null);

  // Negotiated License Edit Modal
  const [editingLicenseTenant, setEditingLicenseTenant] = useState<SaaSTenant | null>(null);
  const [licenseEditForm, setLicenseEditForm] = useState({
    package: 'Pro' as SaaSPackage,
    status: 'Aktif' as SaaSSubscriptionStatus,
    billingCycle: 'Yıllık' as '' | 'Aylık' | 'Yıllık',
    monthlyFee: 14500,
    annualFee: 145000,
    maxUsers: 15,
    notes: ''
  });

  // New Package Form State
  const [packageForm, setPackageForm] = useState({
    name: '',
    monthlyFee: 12000,
    annualFee: 120000,
    maxUsers: 10,
    description: '',
    isPopular: false,
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: true,
      analytics: false
    }
  });

  // New Tenant Form State
  const [newForm, setNewForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    city: 'İstanbul',
    package: '',
    status: 'Aday' as SaaSSubscriptionStatus,
    billingCycle: '' as '' | 'Aylık' | 'Yıllık',
    monthlyFee: '' as string | number,
    annualFee: '' as string | number,
    maxUsers: '' as string | number,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    logoUrl: '',
    notes: ''
  });

  // Edit Tenant Form State
  const [isEditTenantModalOpen, setIsEditTenantModalOpen] = useState(false);
  const [editingTenantForEdit, setEditingTenantForEdit] = useState<SaaSTenant | null>(null);
  const [editTenantForm, setEditTenantForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    city: 'İstanbul',
    package: 'Enterprise' as SaaSPackage,
    status: 'Aktif' as SaaSSubscriptionStatus,
    paymentStatus: 'Sorunsuz' as SaaSPaymentStatus,
    healthStatus: 'Mükemmel' as SaaSHealthStatus,
    billingCycle: 'Yıllık' as '' | 'Aylık' | 'Yıllık',
    monthlyFee: 28000 as number | string,
    annualFee: 336000 as number | string,
    maxUsers: 50 as number | string,
    logoUrl: '',
    notes: ''
  });


  // New SaaS Offer Form State
  const [offerForm, setOfferForm] = useState({
    tenantId: '',
    packageName: 'Pro' as SaaSPackage,
    billingCycle: 'Yıllık' as 'Aylık' | 'Yıllık',
    monthlyFee: 14500,
    annualFee: 145000,
    validDays: 14,
    notes: ''
  });

  // New SaaS Contract Form State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    tenantId: '',
    packageName: 'Pro' as SaaSPackage,
    billingCycle: 'Yıllık' as 'Aylık' | 'Yıllık',
    monthlyFee: 14500,
    annualFee: 145000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  // Calculate KPIs
  const metrics = useMemo(() => {
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'Aktif').length;
    const demoTenants = tenants.filter((t) => t.status === 'Demo').length;

    const mrr = tenants
      .filter((t) => t.status === 'Aktif' || t.status === 'Demo')
      .reduce((sum, t) => {
        if (t.monthlyFee) {
          return sum + t.monthlyFee;
        } else if (t.billingCycle === 'Yıllık' && t.annualFee) {
          return sum + Math.round(t.annualFee / 12);
        }
        return sum;
      }, 0);

    const overdueCount = tenants.filter((t) => t.paymentStatus === 'Gecikmede').length;
    const overdueAmount = tenants
      .filter((t) => t.paymentStatus === 'Gecikmede')
      .reduce((sum, t) => sum + (t.monthlyFee || 0), 0);

    const upsellCount = tenants.filter(
      (t) => t.maxUsers > 0 && t.activeUsers / t.maxUsers >= 0.8
    ).length;

    return {
      totalTenants,
      activeTenants,
      demoTenants,
      mrr,
      overdueCount,
      overdueAmount,
      upsellCount
    };
  }, [tenants]);

  // Filter & Sort Tenants
  const filteredTenants = useMemo(() => {
    const list = tenants.filter((tenant) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        tenant.companyName.toLowerCase().includes(query) ||
        tenant.contactName.toLowerCase().includes(query) ||
        tenant.email.toLowerCase().includes(query) ||
        tenant.tenantCode.toLowerCase().includes(query) ||
        tenant.city.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      const matchesPackage = packageFilter === 'all' || tenant.package === packageFilter;
      const matchesPayment = paymentFilter === 'all' || tenant.paymentStatus === paymentFilter;

      const isUpsellCandidate = tenant.maxUsers > 0 && tenant.activeUsers / tenant.maxUsers >= 0.8;
      const matchesUpsell = !upsellOnlyFilter || isUpsellCandidate;

      return matchesSearch && matchesStatus && matchesPackage && matchesPayment && matchesUpsell;
    });

    return list.sort((a, b) => {
      let valA: any = (a as any)[tenantSort.field];
      let valB: any = (b as any)[tenantSort.field];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return tenantSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return tenantSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tenants, searchQuery, statusFilter, packageFilter, paymentFilter, upsellOnlyFilter, tenantSort]);

  // Filter & Sort Invoices
  const filteredInvoices = useMemo(() => {
    const list = invoices.filter((inv) => {
      if (invoiceMonthFilter === 'all') return true;
      return inv.billingPeriod.toLowerCase().includes(invoiceMonthFilter.toLowerCase());
    });

    return list.sort((a, b) => {
      let valA: any = (a as any)[invoiceSort.field];
      let valB: any = (b as any)[invoiceSort.field];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return invoiceSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return invoiceSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, invoiceMonthFilter, invoiceSort]);

  // Sorted Offers
  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      let valA: any = (a as any)[offerSort.field];
      let valB: any = (b as any)[offerSort.field];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return offerSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return offerSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [offers, offerSort]);

  // Sorted Contracts
  const sortedContracts = useMemo(() => {
    return [...contracts].sort((a, b) => {
      let valA: any = (a as any)[contractSort.field];
      let valB: any = (b as any)[contractSort.field];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return contractSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return contractSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [contracts, contractSort]);

  // Sorted Packages
  const sortedPackages = useMemo(() => {
    return [...packages].sort((a, b) => {
      let valA: any = (a as any)[packageSort.field];
      let valB: any = (b as any)[packageSort.field];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return packageSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return packageSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [packages, packageSort]);

  // Sorted SuperAdmins
  const sortedSuperAdmins = useMemo(() => {
    return [...superAdmins].sort((a, b) => {
      let valA: any = (a as any)[superAdminSort.field];
      let valB: any = (b as any)[superAdminSort.field];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return superAdminSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return superAdminSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [superAdmins, superAdminSort]);

  // Generate Monthly Invoices Batch (Aylık Faturaları Toplu Kesme)
  const handleGenerateMonthlyInvoices = () => {
    const now = new Date();
    const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    const currentMonthName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const yearStr = String(now.getFullYear());
    const monthlyTenants = tenants.filter((t) => t.status === 'Aktif' && t.billingCycle === 'Aylık');

    if (monthlyTenants.length === 0) {
      alert('Aylık ödemeli aktif kiracı bulunamadı.');
      return;
    }

    const newMonthlyInvoices: SaaSInvoice[] = monthlyTenants.map((t) => ({
      id: `inv-rec-${t.id}-${Date.now()}`,
      invoiceNumber: `SAAS-INV-${yearStr}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: t.id,
      tenantName: t.companyName,
      amount: t.monthlyFee,
      billingPeriod: `${currentMonthName} Aylık Lisans`,
      status: 'Bekliyor',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));

    setInvoices((prev) => [...newMonthlyInvoices, ...prev]);
    alert(
      `⚡ ${monthlyTenants.length} Aylık Kiracı İçin ${currentMonthName} Lisans Faturaları Otomatik Kesildi ve Tahsilat Loglarına eklendi!`
    );
  };

  // Handle Mark Invoice Paid
  const handleMarkInvoicePaid = (invId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invId
          ? {
              ...inv,
              status: 'Ödendi',
              paidAt: new Date().toLocaleString('tr-TR')
            }
          : inv
      )
    );
    alert('💳 Fatura tahsilatı kaydedildi ve "Ödendi" olarak işaretlendi!');
  };

  // Handle Save Email Template Edit
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setEmailTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, subject: templateForm.subject, body: templateForm.body }
          : t
      )
    );
    setEditingTemplate(null);
    alert('📧 E-posta şablonu başarıyla güncellendi!');
  };

  // Print and Export Invoice to PDF with Tenant Logo
  const handlePrintInvoice = (inv: SaaSInvoice) => {
    const tenant = tenants.find((t) => t.id === inv.tenantId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pencere açılması engellendi. Lütfen pop-up engelleyicinizi kontrol edin.');
      return;
    }

    const tenantLogo = tenant?.logoUrl
      ? `<img src="${tenant.logoUrl}" style="max-height: 60px; max-width: 180px; object-fit: contain;" />`
      : `<div style="font-size: 20px; font-weight: 800; color: #4f46e5; border: 2px solid #4f46e5; padding: 6px 12px; border-radius: 8px;">${tenant?.companyName ? tenant.companyName.substring(0, 2).toUpperCase() : 'TN'}</div>`;

    const htmlContent = `
      <html>
        <head>
          <title>Fatura - ${inv.invoiceNumber}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.6;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-details {
              text-align: right;
              font-size: 14px;
            }
            .title {
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
            }
            .invoice-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 40px;
              font-size: 14px;
            }
            .box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
            }
            .box h4 {
              margin: 0 0 10px 0;
              color: #64748b;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .box p {
              margin: 4px 0;
              font-weight: 600;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            th {
              background: #f1f5f9;
              color: #475569;
              font-weight: 700;
              text-align: left;
              padding: 12px;
              border-bottom: 2px solid #cbd5e1;
              font-size: 13px;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
            }
            .total-row td {
              font-weight: 700;
              font-size: 16px;
              background: #f8fafc;
              border-top: 2px solid #cbd5e1;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              margin-top: 50px;
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">LİSANS FATURASI</h1>
              <span style="font-size: 14px; color: #64748b; font-weight: 600;">No: ${inv.invoiceNumber}</span>
            </div>
            <div class="company-details">
              <div style="font-size: 18px; font-weight: 800; color: #4f46e5; margin-bottom: 4px;">Codentra</div>
              <span style="color: #64748b;">SaaS Destek & Faturalama Birimi</span><br/>
              <span style="color: #64748b;">support@codentra.com.tr</span>
            </div>
          </div>

          <div class="invoice-info">
            <div class="box">
              <h4>Müşteri Bilgileri (Kiracı)</h4>
              ${tenantLogo}
              <p style="font-size: 16px; color: #0f172a; margin-top: 10px;">${inv.tenantName}</p>
              <span style="color: #64748b;">Yetkili: ${tenant?.contactName || 'Sistem Yetkilisi'}</span><br/>
              <span style="color: #64748b;">E-posta: ${tenant?.email || ''}</span>
            </div>
            <div class="box">
              <h4>Fatura Detayları</h4>
              <table style="width: 100%; margin: 0; font-size: 13px;">
                <tr><td style="padding: 4px 0; border: none; color: #64748b;">Düzenleme Tarihi:</td><td style="padding: 4px 0; border: none; text-align: right; font-weight: 600;">${inv.issueDate}</td></tr>
                <tr><td style="padding: 4px 0; border: none; color: #64748b;">Son Ödeme Tarihi:</td><td style="padding: 4px 0; border: none; text-align: right; font-weight: 600; color: #ef4444;">${inv.dueDate}</td></tr>
                <tr><td style="padding: 4px 0; border: none; color: #64748b;">Ödeme Durumu:</td><td style="padding: 4px 0; border: none; text-align: right; font-weight: 700; color: ${inv.status === 'Ödendi' ? '#10b981' : '#f59e0b'}">${inv.status}</td></tr>
              </table>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Açıklama / Lisans Detayı</th>
                <th style="text-align: right;">Birim Fiyat</th>
                <th style="text-align: right;">Adet</th>
                <th style="text-align: right;">Toplam Tutar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Codentra Teklif & Sözleşme Yönetim Sistemi Lisansı</strong><br/>
                  <span style="font-size: 12px; color: #64748b;">Paket: ${tenant?.package || 'Enterprise'} (${tenant?.maxUsers || 50} Kullanıcı Limiti) • Dönem: ${inv.billingPeriod}</span>
                </td>
                <td style="text-align: right;">₺${inv.amount.toLocaleString('tr-TR')}</td>
                <td style="text-align: right;">1</td>
                <td style="text-align: right; font-weight: 600;">₺${inv.amount.toLocaleString('tr-TR')}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right; border: none;">Ödenecek Toplam:</td>
                <td style="text-align: right; color: #4f46e5; border: none;">₺${inv.amount.toLocaleString('tr-TR')}</td>
              </tr>
            </tbody>
          </table>

          <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 0 8px 8px 0; font-size: 13px; color: #475569;">
            <strong>Bilgilendirme:</strong> Bu fatura elektronik ortamda Codentra SaaS Yönetim modülü tarafından otomatik olarak üretilmiştir. Ödemelerinizi vadeli gününden önce ilgili banka hesabımıza yapmanızı rica ederiz.
          </div>

          <div class="footer">
            <p>Codentra © 2026 — Keyifli çalışmalar dileriz.</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Print and Export Contract to PDF with Tenant Logo
  const handlePrintContract = (cnt: SaaSContract) => {
    const tenant = tenants.find((t) => t.id === cnt.tenantId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pencere açılması engellendi. Lütfen pop-up engelleyicinizi kontrol edin.');
      return;
    }

    const tenantLogo = tenant?.logoUrl
      ? `<img src="${tenant.logoUrl}" style="max-height: 60px; max-width: 180px; object-fit: contain;" />`
      : `<div style="font-size: 20px; font-weight: 800; color: #4f46e5; border: 2px solid #4f46e5; padding: 6px 12px; border-radius: 8px;">${tenant?.companyName ? tenant.companyName.substring(0, 2).toUpperCase() : 'TN'}</div>`;

    const htmlContent = `
      <html>
        <head>
          <title>Sözleşme - ${cnt.contractNumber}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.6;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-details {
              text-align: right;
              font-size: 14px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
            }
            .contract-section {
              margin-bottom: 25px;
            }
            .contract-section h3 {
              color: #0f172a;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 6px;
              margin-bottom: 12px;
              font-size: 16px;
            }
            .contract-section p {
              font-size: 14px;
              margin: 6px 0;
              text-align: justify;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 50px;
            }
            .signature-box {
              border: 1px dashed #cbd5e1;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              min-height: 120px;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              margin-top: 50px;
            }
            @media print {
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">SaaS YAZILIM KULLANIM SÖZLEŞMESİ</h1>
              <span style="font-size: 14px; color: #64748b; font-weight: 600;">Sözleşme No: ${cnt.contractNumber}</span>
            </div>
            <div class="company-details">
              <div style="font-size: 18px; font-weight: 800; color: #4f46e5; margin-bottom: 4px;">Codentra</div>
              <span style="color: #64748b;">Abonelik & Lisans Hizmetleri</span>
            </div>
          </div>

          <div class="contract-section">
            <h3>1. Taraflar</h3>
            <p>
              İşbu sözleşme, bir tarafta <strong>Codentra</strong> (SaaS Sağlayıcı) ile diğer tarafta lisans paketi satın alan ve bilgileri aşağıda yer alan kiracı firma (Müşteri) arasında yürürlüğe girmiştir.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-top: 10px; display: flex; align-items: center; gap: 15px;">
              ${tenantLogo}
              <div>
                <strong>Müşteri Firma:</strong> ${cnt.tenantName}<br/>
                <strong>İmzalayan / Yetkili:</strong> ${cnt.signedBy || 'Belirtilmedi'}<br/>
                <strong>Başlangıç Tarihi:</strong> ${cnt.startDate} • <strong>Bitiş Tarihi:</strong> ${cnt.endDate}
              </div>
            </div>
          </div>

          <div class="contract-section">
            <h3>2. Sözleşme Konusu, Paket ve Fiyatlandırma</h3>
            <p>
              İşbu sözleşmenin konusu, Müşteri'nin Codentra Teklif & Sözleşme Yönetim platformunu SaaS bulut modeliyle kullanmasına yönelik lisans şartları ve kullanım sınırlarının belirlenmesidir.
            </p>
            <p>
              <strong>Lisans Detayları:</strong><br/>
              • Seçilen Abonelik Paketi: <strong>${cnt.packageName} Paketi</strong><br/>
              • Faturalama Periyodu: <strong>${cnt.billingCycle} Ödemeli</strong><br/>
              • Kararlaştırılan Yıllık Tutar: <strong>₺${cnt.annualFee.toLocaleString('tr-TR')}</strong><br/>
              • Aylık Eşdeğer Bedel: <strong>₺${cnt.monthlyEquivalent.toLocaleString('tr-TR')} / ay</strong>
            </p>
          </div>

          <div class="contract-section">
            <h3>3. Genel Hükümler ve Kullanım Koşulları</h3>
            <p>
              3.1 Müşteri, satın aldığı paketin kullanıcı sınırlarına (${tenant?.maxUsers || 15} kullanıcı) uymakla yükümlüdür. Kullanıcı sayısının aşılması durumunda ek paket satın alınması gerekir.<br/>
              3.2 SaaS Sağlayıcı, sistemin kesintisiz çalışması için gerekli altyapı ve güvenlik önlemlerini (%99.9 Uptime garantisi ile) almakla sorumludur.<br/>
              3.3 Ödemelerin gecikmesi durumunda, SaaS Sağlayıcı 14 günlük ihtar süresi sonrasında kiracı hesabını geçici olarak askıya alma hakkını saklı tutar.
            </p>
          </div>

          <div class="signatures">
            <div class="signature-box">
              <strong style="color: #64748b; font-size: 12px;">SaaS SAĞLAYICI</strong>
              <p style="margin-top: 10px; font-weight: 700; color: #4f46e5;">Codentra</p>
              <div style="margin-top: 30px; font-size: 11px; color: #94a3b8;">[Kaşe / İmza]</div>
            </div>
            <div class="signature-box">
              <strong style="color: #64748b; font-size: 12px;">MÜŞTERİ (KİRACI)</strong>
              <p style="margin-top: 10px; font-weight: 700;">${cnt.tenantName}</p>
              <div style="margin-top: 30px; font-size: 11px; color: #94a3b8;">İmza Tarihi: ${cnt.signedAt || cnt.startDate}</div>
            </div>
          </div>

          <div class="footer">
            <p>Codentra SaaS Sistem Sözleşmesi şablonudur. © 2026</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Handle Send Offer Email to Client
  const handleSendOfferEmail = (offer: SaaSOffer) => {
    if (!window.confirm(`"${offer.offerNumber}" nolu teklifi müşteriye göndermek istediğinize emin misiniz?`)) {
      return;
    }
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, status: 'Gönderildi' } : o))
    );
    const tmpl = emailTemplates.find((t) => t.type === 'offer');
    alert(
      `✉️ SaaS Lisans Teklifi E-posta Şablonu Kullanılarak Müşteriye İletildi!\n\nKonu: ${tmpl?.subject.replace('{FIRMA_ADI}', offer.tenantName).replace('{TEKLIF_NO}', offer.offerNumber)}\n\nTeklif No: ${offer.offerNumber}\nFirma: ${offer.tenantName}\nOnline Onay Bağlantısı:\n${offer.onlineLink || 'https://app.codentra.com.tr/offer/' + offer.offerNumber}`
    );
  };

  // Handle Send Invitation Email to Tenant User
  const handleSendInvitation = async (tenantId: string, email: string, companyName: string) => {
    if (!email) {
      alert('⚠️ Kiracı firmaya ait geçerli bir e-posta adresi bulunamadı.');
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const inviteLink = `${origin}?invite=${inviteCode}&tenant=${tenantId}&email=${encodeURIComponent(email)}`;
    setSendingEmail(true);

    const tmpl = emailTemplates.find((t) => t.type === 'invitation');
    const subject = tmpl?.subject ? tmpl.subject.replace('{FIRMA_ADI}', companyName) : `${companyName} — Codentra Teklif ve Sözleşme Yazılımı Aktivasyonu`;
    
    let bodyText = tmpl?.body || `Sayın {YETKILI_ADI},\n\n${companyName} bünyesinde kullanabileceğiniz Codentra Teklif & Sözleşme Yönetimi bulut sisteminiz aktif edilmiştir.\n\nAşağıdaki bağlantıya tıklayarak şifrenizi belirleyebilir ve hemen kullanmaya başlayabilirsiniz:\n{AKTIVASYON_LINKI}\n\nİyi çalışmalar dileriz,\nCodentra SaaS Ekibi`;
    bodyText = bodyText.replace(/{FIRMA_ADI}/g, companyName).replace(/{YETKILI_ADI}/g, companyName + ' Yetkilisi');
    
    const htmlBody = bodyText
      .replace(/\n/g, '<br/>')
      .replace(
        '{AKTIVASYON_LINKI}',
        `<div style="text-align: center; margin: 35px 0;"><a href="${inviteLink}" style="background-color: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px; display: inline-block;">Sisteme Giriş Yapın & Şifrenizi Belirleyin</a></div>`
      );

    const htmlContent = buildCustomerInviteTemplate(htmlBody);

    const res = await sendEmail({
      to: email,
      subject: subject,
      html: htmlContent,
      redirectTo: inviteLink
    });

    setSendingEmail(false);

    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId
          ? {
              ...t,
              activationStatus: 'Davet Gönderildi (Şifre Bekliyor)',
              inviteSentAt: new Date().toLocaleString('tr-TR')
            }
          : t
      )
    );
    if (selectedTenant && selectedTenant.id === tenantId) {
      setSelectedTenant((prev) =>
        prev
          ? {
              ...prev,
              activationStatus: 'Davet Gönderildi (Şifre Bekliyor)',
              inviteSentAt: new Date().toLocaleString('tr-TR')
            }
          : null
      );
    }

    setActiveInviteDialogInfo({
      email,
      companyName,
      inviteLink,
      success: res.success
    });
  };



  // Handle Copy Invite Link
  const handleCopyInviteLink = (tenantId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const inviteLink = `${origin}?invite=${inviteCode}&tenant=${tenantId}`;
    navigator.clipboard?.writeText(inviteLink);
    alert(`📋 Şifre Oluşturma & Davet Bağlantısı kopyalandı:\n${inviteLink}`);
  };



  // Handle Convert Offer to Contract
  const handleConvertOfferToContract = (offer: SaaSOffer) => {
    const newContract: SaaSContract = {
      id: `saas-cnt-${Date.now()}`,
      contractNumber: `SAAS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: offer.tenantId,
      tenantName: offer.tenantName,
      packageName: offer.packageName as SaaSPackage,
      annualFee: offer.annualFee,
      monthlyEquivalent: offer.monthlyFee,
      billingCycle: offer.billingCycle,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Aktif',
      signedAt: new Date().toLocaleString('tr-TR'),
      signedBy: offer.tenantName
    };

    const newInvoice: SaaSInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `SAAS-INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: offer.tenantId,
      tenantName: offer.tenantName,
      amount: offer.billingCycle === 'Yıllık' ? offer.annualFee : offer.monthlyFee,
      billingPeriod: `${offer.billingCycle === 'Yıllık' ? 'Yıllık' : 'Temmuz 2026 Aylık'} Lisans Ücreti`,
      status: 'Bekliyor',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setContracts((prev) => [newContract, ...prev]);
    setInvoices((prev) => [newInvoice, ...prev]);
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, status: 'Kabul Edildi' } : o)));

    setTenants((prev) =>
      prev.map((t) =>
        t.id === offer.tenantId
          ? {
              ...t,
              status: 'Aktif',
              package: offer.packageName as SaaSPackage,
              monthlyFee: offer.monthlyFee,
              annualFee: offer.annualFee,
              billingCycle: offer.billingCycle,
              paymentStatus: 'Sorunsuz'
            }
          : t
      )
    );

    if (previewOffer && previewOffer.id === offer.id) {
      setPreviewOffer((prev) => (prev ? { ...prev, status: 'Kabul Edildi' } : null));
    }

    alert(
      `🎉 TEKLİF ONAYLANDI!\n\nSaaS Lisans Sözleşmesi (${newContract.contractNumber}) ve Lisans Faturası (${newInvoice.invoiceNumber}) otomatik oluşturuldu!`
    );
  };

  // Handle Client Revision Request
  const handleClientRequestRevision = (offer: SaaSOffer) => {
    const note = window.prompt(
      'Müşterinin revizyon / pazarlık notunu giriniz:',
      'Fiyatta ve kullanıcı limitinde özel indirim talep ediliyor.'
    );
    if (note === null) return;

    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, status: 'Pazarlıkta', notes: note } : o))
    );

    if (previewOffer && previewOffer.id === offer.id) {
      setPreviewOffer((prev) => (prev ? { ...prev, status: 'Pazarlıkta', notes: note } : null));
    }

    alert(`💬 Teklif durumu "Pazarlıkta" olarak güncellendi ve müşteri revizyon notu eklendi.`);
  };

  // Handle License Edit Submit
  const handleSaveLicenseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicenseTenant) return;

    setTenants((prev) => {
      const next = prev.map((t) =>
        t.id === editingLicenseTenant.id
          ? {
              ...t,
              package: licenseEditForm.package,
              status: licenseEditForm.status,
              billingCycle: licenseEditForm.billingCycle,
              monthlyFee: Number(licenseEditForm.monthlyFee),
              annualFee: Number(licenseEditForm.annualFee),
              maxUsers: Number(licenseEditForm.maxUsers),
              notes: licenseEditForm.notes || t.notes,
              updatedBy: activeUserEmail,
              updatedAt: new Date().toLocaleString('tr-TR')
            }
          : t
      );
      saveCloudTenants(next);
      return next;
    });

    if (selectedTenant && selectedTenant.id === editingLicenseTenant.id) {
      setSelectedTenant((prev) =>
        prev
          ? {
              ...prev,
              package: licenseEditForm.package,
              status: licenseEditForm.status,
              billingCycle: licenseEditForm.billingCycle,
              monthlyFee: Number(licenseEditForm.monthlyFee),
              annualFee: Number(licenseEditForm.annualFee),
              maxUsers: Number(licenseEditForm.maxUsers),
              notes: licenseEditForm.notes || prev.notes,
              updatedBy: activeUserEmail,
              updatedAt: new Date().toLocaleString('tr-TR')
            }
          : null
      );
    }


    setOffers((prev) =>
      prev.map((o) =>
        o.tenantId === editingLicenseTenant.id || o.tenantName === editingLicenseTenant.companyName
          ? {
              ...o,
              packageName: licenseEditForm.package,
              billingCycle: (licenseEditForm.billingCycle || 'Yıllık') as 'Aylık' | 'Yıllık',
              monthlyFee: Number(licenseEditForm.monthlyFee),
              annualFee: Number(licenseEditForm.annualFee),
              status: licenseEditForm.status === 'Aktif' ? 'Kabul Edildi' : 'Pazarlıkta',
              notes: licenseEditForm.notes ? `Anlaşma Güncellendi: ${licenseEditForm.notes}` : o.notes
            }
          : o
      )
    );

    setEditingLicenseTenant(null);
    alert('Anlaşma ve Lisans bilgileri başarıyla güncellendi! Teklif satırındaki fiyatlar yenilendi.');
  };

  // Handle Add SaaS Offer Submit
  const handleAddOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetTenant = tenants.find((t) => t.id === offerForm.tenantId);

    const newOffer: SaaSOffer = {
      id: `saas-off-${Date.now()}`,
      offerNumber: `OFF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: offerForm.tenantId || (targetTenant ? targetTenant.id : 'tenant-temp'),
      tenantName: targetTenant ? targetTenant.companyName : 'Seçilen Müşteri Adayı',
      packageName: offerForm.packageName,
      billingCycle: offerForm.billingCycle,
      monthlyFee: Number(offerForm.monthlyFee),
      annualFee: Number(offerForm.annualFee),
      status: 'Gönderildi',
      createdAt: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + offerForm.validDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      onlineLink: `https://app.codentra.com.tr/offer/OFF-${Math.floor(100 + Math.random() * 900)}`,

      notes: offerForm.notes
    };

    setOffers((prev) => [newOffer, ...prev]);
    setIsOfferModalOpen(false);
    alert(`📄 SaaS Lisans Teklifi (${newOffer.offerNumber}) başarıyla oluşturuldu ve müşteriye gönderildi!`);
  };

  // Handle Add SaaS Contract Submit
  const handleAddContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetTenant = tenants.find((t) => t.id === contractForm.tenantId);
    if (!targetTenant) {
      alert('Lütfen geçerli bir kiracı seçin.');
      return;
    }

    const newContract: SaaSContract = {
      id: `saas-cnt-${Date.now()}`,
      contractNumber: `SAAS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: contractForm.tenantId,
      tenantName: targetTenant.companyName,
      packageName: contractForm.packageName,
      annualFee: Number(contractForm.annualFee),
      monthlyEquivalent: Number(contractForm.monthlyFee),
      billingCycle: contractForm.billingCycle,
      startDate: contractForm.startDate,
      endDate: contractForm.endDate,
      status: 'Aktif',
      signedAt: new Date().toLocaleString('tr-TR'),
      signedBy: targetTenant.contactName || targetTenant.companyName
    };

    const newInvoice: SaaSInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `SAAS-INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      tenantId: contractForm.tenantId,
      tenantName: targetTenant.companyName,
      amount: contractForm.billingCycle === 'Yıllık' ? Number(contractForm.annualFee) : Number(contractForm.monthlyFee),
      billingPeriod: `${contractForm.billingCycle === 'Yıllık' ? 'Yıllık' : 'İlk Ay'} Lisans Ücreti`,
      status: 'Bekliyor',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setContracts((prev) => [newContract, ...prev]);
    setInvoices((prev) => [newInvoice, ...prev]);

    // Update Tenant Status & Subscription Details
    setTenants((prev) => {
      const next = prev.map((t) =>
        t.id === contractForm.tenantId
          ? {
              ...t,
              status: 'Aktif' as SaaSSubscriptionStatus,
              package: contractForm.packageName,
              monthlyFee: Number(contractForm.monthlyFee),
              annualFee: Number(contractForm.annualFee),
              billingCycle: contractForm.billingCycle,
              paymentStatus: 'Sorunsuz' as SaaSPaymentStatus
            }
          : t
      );
      saveCloudTenants(next);
      return next;
    });

    setIsContractModalOpen(false);
    alert(`🎉 SaaS Sözleşmesi (${newContract.contractNumber}) sıfırdan başarıyla oluşturuldu ve etkinleştirildi!`);
  };

  // Handle Add Package Submit
  const handleAddPackageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.name) return;

    if (editingPackage) {
      setPackages((prev) =>
        prev.map((pkg) =>
          pkg.id === editingPackage.id
            ? {
                ...pkg,
                name: packageForm.name,
                monthlyFee: Number(packageForm.monthlyFee),
                annualFee: Number(packageForm.annualFee),
                maxUsers: Number(packageForm.maxUsers),
                description: packageForm.description,
                isPopular: packageForm.isPopular,
                modulesEnabled: packageForm.modulesEnabled
              }
            : pkg
        )
      );
      setEditingPackage(null);
    } else {
      const newPkg: SaaSPackageDefinition = {
        id: `pkg-${Date.now()}`,
        name: packageForm.name,
        monthlyFee: Number(packageForm.monthlyFee),
        annualFee: Number(packageForm.annualFee),
        maxUsers: Number(packageForm.maxUsers),
        description: packageForm.description || 'Özel tanımlanmış SaaS abonelik paketi.',
        isPopular: packageForm.isPopular,
        modulesEnabled: packageForm.modulesEnabled
      };
      setPackages((prev) => [...prev, newPkg]);
    }

    setIsAddPackageModalOpen(false);
    setPackageForm({
      name: '',
      monthlyFee: 12000,
      annualFee: 120000,
      maxUsers: 10,
      description: '',
      isPopular: false,
      modulesEnabled: { crm: true, offers: true, contracts: true, documents: true, analytics: false }
    });
  };

  // Handle Delete Package
  const handleDeletePackage = (pkgId: string, pkgName: string) => {
    if (window.confirm(`"${pkgName}" paketini silmek istediğinize emin misiniz?`)) {
      setPackages((prev) => prev.filter((p) => p.id !== pkgId));
    }
  };

  // Handle Add Tenant
  const handleAddTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.companyName || !newForm.email) return;

    let monthlyFeeNum = newForm.monthlyFee === '' ? 0 : Number(newForm.monthlyFee);
    let annualFeeNum = newForm.annualFee === '' ? monthlyFeeNum * 12 : Number(newForm.annualFee);

    if (newForm.billingCycle === 'Yıllık' && annualFeeNum > 0 && monthlyFeeNum === 0) {
      monthlyFeeNum = Math.round(annualFeeNum / 12);
    }

    const maxUsersNum = newForm.maxUsers === '' ? 0 : Number(newForm.maxUsers);
    const pkgName = (newForm.package || 'Custom') as SaaSPackage;

    const newTenant: SaaSTenant = {
      id: crypto.randomUUID ? crypto.randomUUID() : '3b3e7f5a-9d2c-4e8a-b1c4-' + Date.now().toString().substring(0, 12),
      tenantCode: `TNT-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName: newForm.companyName,
      contactName: newForm.contactName || 'Belirtilmedi',
      email: newForm.email,
      phone: newForm.phone || 'Belirtilmedi',
      city: newForm.city,
      package: pkgName,
      status: newForm.status,
      paymentStatus: newForm.status === 'Aktif' ? 'Sorunsuz' : 'Bekliyor',
      healthStatus: 'Mükemmel',
      monthlyFee: monthlyFeeNum,
      annualFee: annualFeeNum,
      billingCycle: newForm.billingCycle,
      maxUsers: maxUsersNum,
      activeUsers: newForm.status === 'Aday' ? 0 : 1,
      startDate: newForm.startDate,
      endDate: newForm.endDate,
      autoRenew: true,
      notes: newForm.notes,
      modulesEnabled: {
        crm: true,
        offers: true,
        contracts: newForm.package !== 'Starter',
        documents: newForm.package !== 'Starter',
        analytics: newForm.package === 'Enterprise'
      },
      lastLoginAt: 'Henüz Giriş Yapılmadı',
      createdBy: activeUserEmail,
      createdAt: new Date().toLocaleString('tr-TR'),
      updatedBy: activeUserEmail,
      updatedAt: new Date().toLocaleString('tr-TR'),
      activationStatus: 'Davet Gönderilmedi',
      logoUrl: newForm.logoUrl || undefined
    };

    setTenants((prev) => {
      const next = [newTenant, ...prev];
      saveCloudTenants(next);
      return next;
    });

    setIsAddModalOpen(false);
    setSelectedTenant(newTenant);
  };
  // Handle Toggle Tenant Status — Only toggles between Aktif <-> Askıda
  const handleToggleTenantStatus = async (tenant: SaaSTenant) => {
    // Only show this action for Active or Suspended tenants
    if (tenant.status !== 'Aktif' && tenant.status !== 'Askıda') {
      alert(`"${tenant.companyName}" kiracısı ${tenant.status} durumunda. Durum değiştirmek için "Düzenle" formunu kullanın.`);
      return;
    }
    const newStatus: SaaSSubscriptionStatus = tenant.status === 'Aktif' ? 'Askıda' : 'Aktif';
    if (window.confirm(`"${tenant.companyName}" isimli kiracıyı ${newStatus} yapmak istediğinizden emin misiniz?`)) {
      setTenants((prev) => {
        const next = prev.map((t) =>
          t.id === tenant.id ? { ...t, status: newStatus, paymentStatus: newStatus === 'Aktif' ? 'Sorunsuz' : 'Bekliyor' as SaaSPaymentStatus } : t
        );
        saveCloudTenants(next);
        return next;
      });

      if (selectedTenant?.id === tenant.id) {
        setSelectedTenant((prev) => prev ? { ...prev, status: newStatus, paymentStatus: newStatus === 'Aktif' ? 'Sorunsuz' : 'Bekliyor' as SaaSPaymentStatus } : null);
      }
    }
  };

  // Handle Open Edit Tenant Modal
  const handleOpenEditTenantModal = (tenant: SaaSTenant) => {
    setEditingTenantForEdit(tenant);
    setEditTenantForm({
      companyName: tenant.companyName || '',
      contactName: tenant.contactName || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      city: tenant.city || 'İstanbul',
      package: tenant.package || 'Enterprise',
      status: tenant.status || 'Aktif',
      paymentStatus: tenant.paymentStatus || 'Sorunsuz',
      healthStatus: tenant.healthStatus || 'Mükemmel',
      billingCycle: tenant.billingCycle || 'Yıllık',
      monthlyFee: tenant.monthlyFee || 0,
      annualFee: tenant.annualFee || 0,
      maxUsers: tenant.maxUsers || 10,
      logoUrl: tenant.logoUrl || '',
      notes: tenant.notes || ''
    });
    setIsEditTenantModalOpen(true);
  };

  // Handle Save Edit Tenant Submit
  const handleSaveEditTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenantForEdit || !editTenantForm.companyName) return;

    setTenants((prev) => {
      const next = prev.map((t) =>
        t.id === editingTenantForEdit.id
          ? {
              ...t,
              companyName: editTenantForm.companyName,
              contactName: editTenantForm.contactName,
              email: editTenantForm.email,
              phone: editTenantForm.phone,
              city: editTenantForm.city,
              package: editTenantForm.package,
              status: editTenantForm.status,
              paymentStatus: editTenantForm.paymentStatus,
              healthStatus: editTenantForm.healthStatus,
              billingCycle: editTenantForm.billingCycle,
              monthlyFee: Number(editTenantForm.monthlyFee),
              annualFee: Number(editTenantForm.annualFee),
              maxUsers: Number(editTenantForm.maxUsers),
              logoUrl: editTenantForm.logoUrl,
              notes: editTenantForm.notes,
              updatedAt: new Date().toLocaleString('tr-TR')
            }
          : t
      );
      saveCloudTenants(next);
      return next;
    });

    if (selectedTenant && selectedTenant.id === editingTenantForEdit.id) {
      setSelectedTenant((prev) =>
        prev
          ? {
              ...prev,
              companyName: editTenantForm.companyName,
              contactName: editTenantForm.contactName,
              email: editTenantForm.email,
              phone: editTenantForm.phone,
              city: editTenantForm.city,
              package: editTenantForm.package,
              status: editTenantForm.status,
              paymentStatus: editTenantForm.paymentStatus,
              healthStatus: editTenantForm.healthStatus,
              billingCycle: editTenantForm.billingCycle,
              monthlyFee: Number(editTenantForm.monthlyFee),
              annualFee: Number(editTenantForm.annualFee),
              maxUsers: Number(editTenantForm.maxUsers),
              logoUrl: editTenantForm.logoUrl,
              notes: editTenantForm.notes
            }
          : null
      );
    }

    setIsEditTenantModalOpen(false);
    setEditingTenantForEdit(null);
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header & Metrics Panel */}
      <article className="panel panel-wide panel-elevated">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Yazılım Firması Paneli (Super Admin)</p>
            <h3>SaaS Kiracıları, Tahsilat & Şablon Yönetimi</h3>
          </div>
          <div className="hero-actions" style={{ gap: 10 }}>
            {mainTab === 'packages' ? (
              <button
                className="primary-action"
                onClick={() => {
                  setEditingPackage(null);
                  setPackageForm({
                    name: '',
                    monthlyFee: 12000,
                    annualFee: 120000,
                    maxUsers: 10,
                    description: '',
                    isPopular: false,
                    modulesEnabled: { crm: true, offers: true, contracts: true, documents: true, analytics: false }
                  });
                  setIsAddPackageModalOpen(true);
                }}
              >
                + Yeni Paket Tanımla
              </button>
            ) : (
              <>
                <button
                  className="primary-action"
                  onClick={() => {
                    setNewForm({
                      companyName: '',
                      contactName: '',
                      email: '',
                      phone: '',
                      city: 'İstanbul',
                      package: '',
                      status: 'Aday',
                      billingCycle: '',
                      monthlyFee: '',
                      annualFee: '',
                      maxUsers: '',
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      logoUrl: '',
                      notes: ''
                    });

                    setIsAddModalOpen(true);
                  }}
                >
                  + Yeni SaaS Kiracısı Ekle
                </button>
                <button
                  className="secondary-action"
                  onClick={() => {
                    setOfferForm({
                      tenantId: '',
                      packageName: 'Pro',
                      billingCycle: 'Yıllık',
                      monthlyFee: 14500,
                      annualFee: 145000,
                      validDays: 14,
                      notes: ''
                    });
                    setIsOfferModalOpen(true);
                  }}
                >
                  📄 SaaS Lisans Teklifi Hazırla
                </button>
              </>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <section className="metrics-grid metrics-grid-compact" style={{ marginTop: 0, marginBottom: 16 }}>
          <article className="panel metric-card metric-card-minimal">
            <p className="eyebrow">Toplam Kiracı</p>
            <strong>{metrics.totalTenants}</strong>
            <span>{metrics.activeTenants} Aktif • {metrics.demoTenants} Demo</span>
          </article>

          <article className="panel metric-card metric-card-minimal">
            <p className="eyebrow">Aylık Gelir (MRR)</p>
            <strong>₺{metrics.mrr.toLocaleString('tr-TR')}</strong>
            <span>Abonelik lisans toplamı</span>
          </article>

          <article className="panel metric-card metric-card-minimal">
            <p className="eyebrow">Upsell / Limit Uyarısı</p>
            <strong>{metrics.upsellCount} Firma</strong>
            <span>%80+ Kapasite kullanımında</span>
          </article>

          <article className="panel metric-card metric-card-minimal">
            <p className="eyebrow">Tahsilat Faturası</p>
            <strong>{invoices.length} Fatura</strong>
            <span>{invoices.filter((i) => i.status === 'Gecikmede').length} Geciken Ödeme</span>
          </article>
        </section>

        {/* Main Section Navigation Tabs (Moved Below KPI Cards as Requested) */}
        <div className="filter-group" style={{ justifyContent: 'flex-start', marginBottom: 0, flexWrap: 'wrap', gap: 8 }}>
          <button
            className={`filter-chip ${mainTab === 'tenants' ? 'filter-chip-active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', fontWeight: 600 }}
            onClick={() => setMainTab('tenants')}
          >
            🏢 Kiracı Müşteriler ({tenants.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'offers-contracts' ? 'filter-chip-active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', fontWeight: 600 }}
            onClick={() => setMainTab('offers-contracts')}
          >
            📄 Teklifler ({offers.length}) & Sözleşmeler ({contracts.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'invoices' ? 'filter-chip-active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', fontWeight: 600 }}
            onClick={() => setMainTab('invoices')}
          >
            💳 Tahsilat & Fatura Logları ({invoices.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'email-templates' ? 'filter-chip-active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', fontWeight: 600 }}
            onClick={() => setMainTab('email-templates')}
          >
            📧 E-posta Şablonları ({emailTemplates.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'packages' ? 'filter-chip-active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', fontWeight: 600 }}
            onClick={() => setMainTab('packages')}
          >
            📦 Abonelik Paketleri ({packages.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'super-admins' ? 'filter-chip-active' : ''}`}
            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '20px', fontWeight: 600, background: mainTab === 'super-admins' ? '#6366f1' : undefined, color: mainTab === 'super-admins' ? '#ffffff' : undefined }}
            onClick={() => setMainTab('super-admins')}
          >
            🛡️ Süper Admin Kadrosu ({superAdmins.length})
          </button>
        </div>
      </article>

      {/* TAB 1: Tenants List */}
      {mainTab === 'tenants' && (
        <article className="panel panel-wide panel-elevated">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Müşteri Portföyü</p>
              <h3>SaaS Kiracı Listesi</h3>
            </div>
            <span className="mini-badge">
              {filteredTenants.length} / {tenants.length} Kiracı
            </span>
          </div>

          {/* Filter Bar */}
          <div className="customer-filter-grid" style={{ marginBottom: 14, gap: 12 }}>
            <label className="search-field customer-search-field" style={{ position: 'relative' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Arama</span>
              <input
                type="text"
                placeholder="Firma adı, kod, şehir veya yetkili ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '6px 12px', height: '36px', borderRadius: '8px' }}
              />
            </label>

            <label className="select-field">
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Abonelik Durumu</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ fontSize: '0.82rem', padding: '6px 12px', height: '36px', borderRadius: '8px' }}>
                <option value="all">Tüm Durumlar</option>
                <option value="Aktif">Aktif</option>
                <option value="Demo">Demo / Deneme</option>
                <option value="Aday">Aday Müşteri</option>
                <option value="Askıda">Askıda / Dondurulmuş</option>
                <option value="İptal">İptal Edilmiş</option>
              </select>
            </label>

            <label className="select-field">
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Paket Tipi</span>
              <select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)} style={{ fontSize: '0.82rem', padding: '6px 12px', height: '36px', borderRadius: '8px' }}>
                <option value="all">Tüm Paketler</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.name.split(' ')[0]}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Ödeme Durumu</span>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} style={{ fontSize: '0.82rem', padding: '6px 12px', height: '36px', borderRadius: '8px' }}>
                <option value="all">Tüm Ödeme Durumları</option>
                <option value="Sorunsuz">✅ Sorunsuz</option>
                <option value="Bekliyor">⏳ Ödeme Bekliyor</option>
                <option value="Gecikmede">🔴 Gecikmede</option>
              </select>
            </label>

            <label className="select-field">
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Limit & Upsell Durumu</span>
              <select
                value={upsellOnlyFilter ? 'upsell' : 'all'}
                onChange={(e) => setUpsellOnlyFilter(e.target.value === 'upsell')}
                style={{ fontSize: '0.82rem', padding: '6px 12px', height: '36px', borderRadius: '8px' }}
              >
                <option value="all">Tüm Kullanıcı Seviyeleri</option>
                <option value="upsell">⚠️ Limit Sınırında (%80+ Kapasite - Upsell)</option>
              </select>
            </label>
          </div>

          {/* Customer Table */}
          <div className="customer-table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort(tenantSort, setTenantSort, 'companyName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Kiracı Firma & Yetkili {tenantSort.field === 'companyName' ? (tenantSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(tenantSort, setTenantSort, 'package')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Paket & Kullanıcı Kullanımı {tenantSort.field === 'package' ? (tenantSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(tenantSort, setTenantSort, 'annualFee')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Lisans Ücreti {tenantSort.field === 'annualFee' ? (tenantSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(tenantSort, setTenantSort, 'startDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Başlangıç Tarihi {tenantSort.field === 'startDate' ? (tenantSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(tenantSort, setTenantSort, 'activationStatus')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Şifre & Giriş Durumu {tenantSort.field === 'activationStatus' ? (tenantSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(tenantSort, setTenantSort, 'healthStatus')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Ödeme & Sağlık {tenantSort.field === 'healthStatus' ? (tenantSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(tenantSort, setTenantSort, 'status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Durum {tenantSort.field === 'status' ? (tenantSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th style={{ textAlign: 'right' }}>Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="customer-table-empty">
                      Aranan kriterlere uygun SaaS kiracısı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const isLimitWarning = tenant.maxUsers > 0 && tenant.activeUsers / tenant.maxUsers >= 0.8;
                    const usagePercent = tenant.maxUsers > 0 ? Math.round((tenant.activeUsers / tenant.maxUsers) * 100) : 0;

                    return (
                      <tr
                        key={tenant.id}
                        className={`customer-table-row ${selectedTenant?.id === tenant.id ? 'customer-table-row-active' : ''}`}
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setEditableTenant({ ...tenant });
                          setDetailTab('info');
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {tenant.logoUrl ? (
                              <img
                                src={tenant.logoUrl}
                                alt={tenant.companyName}
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  objectFit: 'contain',
                                  border: '1px solid var(--border)',
                                  background: '#ffffff',
                                  padding: 3,
                                  flexShrink: 0
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                  color: '#ffffff',
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0
                                }}
                              >
                                {tenant.companyName ? tenant.companyName.substring(0, 2).toUpperCase() : 'TN'}
                              </div>
                            )}
                            <div>
                              <strong style={{ fontSize: '0.95rem', display: 'block' }}>{tenant.companyName}</strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {tenant.tenantCode} • {tenant.city}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                                {tenant.contactName} ({tenant.email})
                              </span>
                            </div>
                          </div>
                        </td>


                        <td>
                          <strong>{tenant.package ? `${tenant.package} Paketi` : 'Paket Seçilmedi'}</strong>
                          <span style={{ fontSize: '0.78rem', color: isLimitWarning ? '#b45309' : 'var(--text-muted)', display: 'block', fontWeight: isLimitWarning ? 700 : 400 }}>
                            {tenant.maxUsers > 0 ? `${tenant.activeUsers} / ${tenant.maxUsers} Kullanıcı (%${usagePercent})` : 'Sınır Belirtilmedi'}
                          </span>

                          {/* UPSELL / LIMIT WARNING BADGE */}
                          {isLimitWarning && (
                            <span
                              className="mini-badge"
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#b45309',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontSize: '0.72rem',
                                marginTop: 4,
                                display: 'inline-block'
                              }}
                              title="Kullanıcı limitine yaklaşıldı. Üst pakete yükseltme (Upsell) teklifi sunulması önerilir."
                            >
                              ⚠️ Limit Sınırında (Upsell Fırsatı)
                            </span>
                          )}
                        </td>

                        <td>
                          {tenant.monthlyFee > 0 ? (
                            <>
                              <strong>
                                ₺{tenant.billingCycle === 'Yıllık' && tenant.annualFee
                                  ? tenant.annualFee.toLocaleString('tr-TR')
                                  : tenant.monthlyFee.toLocaleString('tr-TR')}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                / {tenant.billingCycle === 'Yıllık' ? 'yıl (İndirimli)' : 'ay'}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Belirtilmedi (Aday)</span>
                          )}
                        </td>

                        <td>
                          <span style={{ fontSize: '0.78rem', display: 'block', fontWeight: 600 }}>
                            {new Date(tenant.startDate).toLocaleDateString('tr-TR')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                            Bitiş: {new Date(tenant.endDate).toLocaleDateString('tr-TR')}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.78rem', display: 'block', fontWeight: 600 }}>
                            {tenant.activationStatus || 'Davet Gönderilmedi'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                            Giriş: {tenant.lastLoginAt}
                          </span>
                        </td>

                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              color:
                                tenant.paymentStatus === 'Sorunsuz'
                                  ? '#10b981'
                                  : tenant.paymentStatus === 'Gecikmede'
                                  ? '#ef4444'
                                  : '#f59e0b'
                            }}
                          >
                            ● {tenant.paymentStatus}
                          </span>
                        </td>

                        <td>
                          <span
                            className="mini-badge"
                            style={{
                              background:
                                tenant.status === 'Aktif'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : tenant.status === 'Demo'
                                  ? 'rgba(59, 130, 246, 0.12)'
                                  : tenant.status === 'Askıda'
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : 'rgba(17, 24, 39, 0.06)',
                              color:
                                tenant.status === 'Aktif'
                                  ? '#047857'
                                  : tenant.status === 'Demo'
                                  ? '#1d4ed8'
                                  : tenant.status === 'Askıda'
                                  ? '#b91c1c'
                                  : 'var(--text-main)',
                              borderColor: 'var(--border)'
                            }}
                          >
                            {tenant.status}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                            

                            {(tenant.status === 'Aktif' || tenant.status === 'Askıda') && (
                              <button
                                className="btn-action-ghost"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: tenant.status === 'Aktif' ? '#ef4444' : '#10b981' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTenantStatus(tenant);
                                }}
                                title={tenant.status === 'Aktif' ? "Kiracıyı Askıya Al" : "Kiracıyı Aktife Al"}
                              >
                                {tenant.status === 'Aktif' ? '⏸ Askıya Al' : '▶ Aktife Al'}
                              </button>
                            )}

                            <button
                              className="btn-action-primary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onImpersonateTenant) onImpersonateTenant(tenant);
                                else if (onNavigateSection) onNavigateSection('customers');
                              }}
                            >
                              🚀 CRM'e Geç
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* TAB 2: Offers & Contracts List */}
      {mainTab === 'offers-contracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* SaaS Offers */}
          <article className="panel panel-wide panel-elevated">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Aday Müşteri Lisans Teklifleri</p>
                <h3>SaaS Lisans Teklifleri</h3>
              </div>
              <button
                className="primary-action"
                onClick={() => {
                  setOfferForm({
                    tenantId: '',
                    packageName: 'Pro',
                    billingCycle: 'Yıllık',
                    monthlyFee: 14500,
                    annualFee: 145000,
                    validDays: 14,
                    notes: ''
                  });
                  setIsOfferModalOpen(true);
                }}
              >
                + Yeni SaaS Lisans Teklifi Hazırla
              </button>
            </div>

            <div className="customer-table-wrap">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort(offerSort, setOfferSort, 'offerNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Teklif No {offerSort.field === 'offerNumber' ? (offerSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(offerSort, setOfferSort, 'tenantName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Kiracı / Aday Firma {offerSort.field === 'tenantName' ? (offerSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(offerSort, setOfferSort, 'packageName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Paket & Periyot {offerSort.field === 'packageName' ? (offerSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(offerSort, setOfferSort, 'annualFee')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Teklif Tutarı {offerSort.field === 'annualFee' ? (offerSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(offerSort, setOfferSort, 'createdAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Tarih / Geçerlilik {offerSort.field === 'createdAt' ? (offerSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(offerSort, setOfferSort, 'status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Durum {offerSort.field === 'status' ? (offerSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th style={{ textAlign: 'right' }}>Teklif İşlemleri & Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOffers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="customer-table-empty">
                        Henüz oluşturulmuş lisans teklifi bulunmamaktadır.
                      </td>
                    </tr>
                  ) : (
                    sortedOffers.map((off) => (
                    <tr key={off.id}>
                      <td><strong>{off.offerNumber}</strong></td>
                      <td>
                        <strong style={{ fontSize: '0.95rem', display: 'block' }}>{off.tenantName}</strong>
                        {off.notes && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: '0.78rem',
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: '#b45309',
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              maxWidth: 320
                            }}
                          >
                            💬 <strong>Müşteri Revizyon Notu:</strong> "{off.notes}"
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="mini-badge">{off.packageName}</span> ({off.billingCycle})
                      </td>
                      <td>
                        <strong>
                          ₺{off.billingCycle === 'Yıllık' ? off.annualFee.toLocaleString('tr-TR') : off.monthlyFee.toLocaleString('tr-TR')}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          / {off.billingCycle === 'Yıllık' ? 'yıl' : 'ay'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', display: 'block' }}>{off.createdAt}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Son: {off.validUntil}</span>
                      </td>
                      <td>
                        <span
                          className="mini-badge"
                          style={{
                            background:
                              off.status === 'Kabul Edildi'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : off.status === 'Pazarlıkta'
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(59, 130, 246, 0.12)',
                            color:
                              off.status === 'Kabul Edildi'
                                ? '#047857'
                                : off.status === 'Pazarlıkta'
                                ? '#d97706'
                                : '#1d4ed8'
                          }}
                        >
                          {off.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            className="btn-action-ghost"
                            onClick={() => handleSendOfferEmail(off)}
                            title="Müşteriye teklif e-postası ve onay linki ilet"
                          >
                            ✉️ Gönder
                          </button>

                          <button
                            className="btn-action-ghost"
                            onClick={() => {
                              const link = off.onlineLink || `https://app.codentra.com.tr/offer/${off.offerNumber}`;

                              navigator.clipboard?.writeText(link);
                              alert(`📋 Müşteri Online Teklif Onay Bağlantısı kopyalandı:\n${link}`);
                            }}
                            title="Müşterinin online onaylayacağı bağlantıyı kopyala"
                          >
                            🔗 Link Kopyala
                          </button>

                          <button
                            className="btn-action-ghost"
                            style={{ color: '#047857', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                            onClick={() => setPreviewOffer(off)}
                            title="Müşteri gözünden teklif belgesini görün ve online onay/pazarlık sürecini simüle edin"
                          >
                            👁️ Müşteri Gözünden Önizle
                          </button>

                          {off.status === 'Pazarlıkta' && (
                            <button
                              className="btn-action-warning"
                              onClick={() => {
                                const target = tenants.find((t) => t.id === off.tenantId || t.companyName === off.tenantName);
                                if (target) {
                                  setEditingLicenseTenant(target);
                                  setLicenseEditForm({
                                    package: off.packageName as SaaSPackage,
                                    status: target.status,
                                    billingCycle: off.billingCycle,
                                    monthlyFee: off.monthlyFee,
                                    annualFee: off.annualFee,
                                    maxUsers: target.maxUsers || 15,
                                    notes: off.notes || ''
                                  });
                                }
                              }}
                              title="Müşteri revizyon talebi girdi. Yeni fiyat ve şartları güncelleyin."
                            >
                              ✏️ Pazarlığı Güncelle
                            </button>
                          )}

                          <button
                            className="btn-action-good"
                            onClick={() => handleConvertOfferToContract(off)}
                            title="Doğrudan sözleşmeye dönüştür"
                          >
                            {off.status === 'Kabul Edildi' ? '✍️ Sözleşme Yap / Aktifleştir' : '✍️ Sözleşmeye Dönüştür'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </article>

          {/* SaaS Contracts */}
          <article className="panel panel-wide panel-elevated">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Resmi Lisans Anlaşmaları</p>
                <h3>SaaS Lisans Sözleşmeleri</h3>
              </div>
              <button
                className="primary-action"
                onClick={() => {
                  setContractForm({
                    tenantId: '',
                    packageName: 'Pro',
                    billingCycle: 'Yıllık',
                    monthlyFee: 14500,
                    annualFee: 145000,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    notes: ''
                  });
                  setIsContractModalOpen(true);
                }}
              >
                + Sıfırdan SaaS Sözleşmesi Yap
              </button>
            </div>

            <div className="customer-table-wrap">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort(contractSort, setContractSort, 'contractNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Sözleşme No {contractSort.field === 'contractNumber' ? (contractSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(contractSort, setContractSort, 'tenantName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Kiracı Firma {contractSort.field === 'tenantName' ? (contractSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(contractSort, setContractSort, 'packageName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Paket {contractSort.field === 'packageName' ? (contractSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(contractSort, setContractSort, 'annualFee')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Yıllık Lisans Tutarı {contractSort.field === 'annualFee' ? (contractSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(contractSort, setContractSort, 'startDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Sözleşme Dönemi {contractSort.field === 'startDate' ? (contractSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(contractSort, setContractSort, 'signedBy')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      İmzalayan / Tarih {contractSort.field === 'signedBy' ? (contractSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th onClick={() => toggleSort(contractSort, setContractSort, 'status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Durum {contractSort.field === 'status' ? (contractSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                    </th>
                    <th style={{ textAlign: 'right' }}>Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContracts.length === 0 ? (
                    <tr><td colSpan={8} className="customer-table-empty">Henüz sözleşme kaydı oluşturulmadı.</td></tr>
                  ) : (
                    sortedContracts.map((cnt) => (
                    <tr key={cnt.id}>
                      <td><strong>{cnt.contractNumber}</strong></td>
                      <td>{cnt.tenantName}</td>
                      <td><span className="mini-badge">{cnt.packageName}</span></td>
                      <td><strong>₺{cnt.annualFee.toLocaleString('tr-TR')}</strong> / yıl</td>
                      <td>{cnt.startDate} → {cnt.endDate}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', display: 'block' }}>{cnt.signedBy || 'Yetkili'}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cnt.signedAt || cnt.startDate}</span>
                      </td>
                      <td>
                        <span
                          className="mini-badge"
                          style={{
                            background: cnt.status === 'Aktif' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: cnt.status === 'Aktif' ? '#047857' : '#d97706'
                          }}
                        >
                          {cnt.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn-action-ghost"
                            onClick={() => handlePrintContract(cnt)}
                            title="Sözleşme PDF'ini indir"
                          >
                            📄 PDF İndir
                          </button>
                          {cnt.status === 'Aktif' && (
                            <button
                              className="btn-action-ghost"
                              style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                              onClick={() => {
                                if (window.confirm(`"${cnt.contractNumber}" sözleşmesini iptal etmek istediğinize emin misiniz?`)) {
                                  setContracts((prev) => prev.map((c) => c.id === cnt.id ? { ...c, status: 'İptal' } : c));
                                  alert('Sözleşme iptal edildi.');
                                }
                              }}
                              title="Sözleşmeyi iptal et"
                            >
                              ❌ İptal Et
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {/* TAB 3: Invoices & Payments */}
      {mainTab === 'invoices' && (
        <article className="panel panel-wide panel-elevated">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Otomatik Lisans Faturaları & Tahsilat Dönemleri</p>
              <h3>SaaS Fatura & Ay Bazında Tahsilat Logları</h3>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="primary-action"
                onClick={handleGenerateMonthlyInvoices}
                title="Aylık ödemeli tüm aktif kiracılar için bu ayın lisans faturasını toplu keser"
              >
                ⚡ Bu Ayın Otomatik Faturalarını Kes (Aylık Toplu)
              </button>
            </div>
          </div>

          {/* Month Filter */}
          <div className="customer-filter-grid" style={{ marginBottom: 18, gridTemplateColumns: '1fr 2fr' }}>
            <label className="select-field">
              <span>Dönem / Ay Filtresi</span>
              <select
                value={invoiceMonthFilter}
                onChange={(e) => setInvoiceMonthFilter(e.target.value)}
              >
                <option value="all">Tüm Lisans Dönemleri</option>
                <option value="Ağustos 2026">Ağustos 2026</option>
                <option value="Temmuz 2026">Temmuz 2026</option>
                <option value="Haziran 2026">Haziran 2026</option>
                <option value="Mayıs 2026">Mayıs 2026</option>
                <option value="Nisan 2026">Nisan 2026</option>
                <option value="2025 - 2026 Yıllık">2025 - 2026 Yıllık Lisanslar</option>
              </select>
            </label>
          </div>

          <div className="customer-table-wrap">
            <table className="customer-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort(invoiceSort, setInvoiceSort, 'invoiceNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Fatura No {invoiceSort.field === 'invoiceNumber' ? (invoiceSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(invoiceSort, setInvoiceSort, 'tenantName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Kiracı Firma {invoiceSort.field === 'tenantName' ? (invoiceSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(invoiceSort, setInvoiceSort, 'billingPeriod')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Abonelik Periyodu / Ay {invoiceSort.field === 'billingPeriod' ? (invoiceSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(invoiceSort, setInvoiceSort, 'amount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Fatura Tutarı {invoiceSort.field === 'amount' ? (invoiceSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(invoiceSort, setInvoiceSort, 'dueDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Kesim & Vade Tarihi {invoiceSort.field === 'dueDate' ? (invoiceSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th onClick={() => toggleSort(invoiceSort, setInvoiceSort, 'status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Tahsilat Durumu {invoiceSort.field === 'status' ? (invoiceSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                  </th>
                  <th style={{ textAlign: 'right' }}>Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><strong>{inv.invoiceNumber}</strong></td>
                    <td>{inv.tenantName}</td>
                    <td><span className="mini-badge">{inv.billingPeriod}</span></td>
                    <td><strong>₺{inv.amount.toLocaleString('tr-TR')}</strong></td>
                    <td>
                      <span style={{ fontSize: '0.8rem', display: 'block' }}>{inv.issueDate}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vade: {inv.dueDate}</span>
                    </td>
                    <td>
                      <span
                        className="mini-badge"
                        style={{
                          background:
                            inv.status === 'Ödendi'
                              ? 'rgba(16, 185, 129, 0.12)'
                              : inv.status === 'Gecikmede'
                              ? 'rgba(239, 68, 68, 0.12)'
                              : 'rgba(245, 158, 11, 0.12)',
                          color:
                            inv.status === 'Ödendi'
                              ? '#047857'
                              : inv.status === 'Gecikmede'
                              ? '#b91c1c'
                              : '#d97706'
                        }}
                      >
                        ● {inv.status}
                      </span>
                      {inv.paidAt && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                          Ödeme: {inv.paidAt}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                        {inv.status !== 'Ödendi' && (
                          <button
                            className="btn-action-good"
                            onClick={() => handleMarkInvoicePaid(inv.id)}
                          >
                            ✅ Ödendi İşaretle
                          </button>
                        )}
                        <button
                          className="btn-action-ghost"
                          onClick={() => handlePrintInvoice(inv)}
                        >
                          📄 PDF Fatura
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* TAB 4: Email Templates Management */}
      {mainTab === 'email-templates' && (
        <article className="panel panel-wide panel-elevated">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Müşteri İletişim & Otomasyon</p>
              <h3>E-posta Şablonları & Özelleştirici</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20, marginTop: 12 }}>
            {emailTemplates.map((tmpl) => (
              <div key={tmpl.id} className="module-card module-card-flat" style={{ padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>
                    {tmpl.type === 'offer' ? '📄 Teklif Şablonu' : '✉️ Aktivasyon Şablonu'}
                  </span>
                  <h4 style={{ margin: '0 0 12px', fontSize: '1.15rem' }}>{tmpl.title}</h4>

                  <div style={{ background: '#f9fafb', padding: 14, borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 14 }}>
                    <strong style={{ fontSize: '0.84rem', color: '#374151', display: 'block', marginBottom: 4 }}>Konu (Subject):</strong>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#111827', fontWeight: 600 }}>{tmpl.subject}</p>
                  </div>

                  <div style={{ background: '#f9fafb', padding: 14, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                    <strong style={{ fontSize: '0.84rem', color: '#374151', display: 'block', marginBottom: 6 }}>E-posta İçeriği:</strong>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.5 }}>
                      {tmpl.body}
                    </pre>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Dinamik Etiketler: {'{FIRMA_ADI}'}, {'{YETKILI_ADI}'}, {'{ONAY_LINKI}'}
                  </span>
                  <button
                    className="primary-action"
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => {
                      setEditingTemplate(tmpl);
                      setTemplateForm({ subject: tmpl.subject, body: tmpl.body });
                    }}
                  >
                    ✏️ Şablonu Düzenle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* TAB 5: Packages Management */}
      {mainTab === 'packages' && (
        <article className="panel panel-wide panel-elevated">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fiyatlandırma & Lisans Modelleri</p>
              <h3>SaaS Abonelik Paketleri</h3>
            </div>
            <button
              className="primary-action"
              onClick={() => {
                setEditingPackage(null);
                setPackageForm({
                  name: '',
                  monthlyFee: 12000,
                  annualFee: 120000,
                  maxUsers: 10,
                  description: '',
                  isPopular: false,
                  modulesEnabled: { crm: true, offers: true, contracts: true, documents: true, analytics: false }
                });
                setIsAddPackageModalOpen(true);
              }}
            >
              + Yeni Paket Oluştur
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginTop: 12 }}>
            {packages.map((pkg) => {
              const activeCount = tenants.filter((t) => t.package === pkg.name.split(' ')[0]).length;

              return (
                <div
                  key={pkg.id}
                  className="module-card module-card-flat"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 20,
                    position: 'relative',
                    border: pkg.isPopular ? '2px solid var(--accent)' : '1px solid var(--border)'
                  }}
                >
                  {pkg.isPopular && (
                    <span
                      className="mini-badge"
                      style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        background: 'var(--accent)',
                        color: '#fff'
                      }}
                    >
                      En Çok Tercih Edilen
                    </span>
                  )}

                  <div>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{pkg.name}</h4>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                      {pkg.description}
                    </p>

                    <div style={{ marginBottom: 16 }}>
                      <strong style={{ fontSize: '1.8rem', display: 'block', color: 'var(--text-main)' }}>
                        ₺{pkg.monthlyFee.toLocaleString('tr-TR')}
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}> / ay</span>
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Yıllık: ₺{pkg.annualFee.toLocaleString('tr-TR')} (2 Ay İndirimli)
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 14 }}>
                      <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                        Limitler & Modüller
                      </span>
                      <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', display: 'grid', gap: 4 }}>
                        <li><strong>{pkg.maxUsers} Kullanıcıya Kadar</strong></li>
                        <li>{pkg.modulesEnabled.crm ? '✓ Müşteri CRM Yönetimi' : '✗ Müşteri CRM (Yok)'}</li>
                        <li>{pkg.modulesEnabled.offers ? '✓ Revizyonlu Teklif Modülü' : '✗ Teklif Modülü (Yok)'}</li>
                        <li>{pkg.modulesEnabled.contracts ? '✓ Hizmet Sözleşmeleri Modülü' : '✗ Sözleşme Modülü (Yok)'}</li>
                        <li>{pkg.modulesEnabled.documents ? '✓ Doküman Kütüphanesi' : '✗ Doküman Kütüphanesi (Yok)'}</li>
                        <li>{pkg.modulesEnabled.analytics ? '✓ Gelişmiş Analitik Raporlar' : '✗ Analitik Raporlar (Yok)'}</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong>{activeCount} Kiracı</strong> bu pakette
                    </span>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-action-ghost"
                        onClick={() => {
                          setEditingPackage(pkg);
                          setPackageForm({
                            name: pkg.name,
                            monthlyFee: pkg.monthlyFee,
                            annualFee: pkg.annualFee,
                            maxUsers: pkg.maxUsers,
                            description: pkg.description,
                            isPopular: Boolean(pkg.isPopular),
                            modulesEnabled: pkg.modulesEnabled
                          });
                          setIsAddPackageModalOpen(true);
                        }}
                      >
                        ✏️ Düzenle
                      </button>

                      <button
                        className="btn-action-ghost"
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}
      {/* TAB 6: Super Admins Management */}
      {mainTab === 'super-admins' && (
        <article className="panel panel-wide panel-elevated">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SaaS Sistem Sahipleri & Yetkili Kadro</p>
              <h3>🛡️ SaaS Süper Admin Yetkileri Yönetimi</h3>
            </div>
            <span className="mini-badge" style={{ background: '#6366f1', color: '#ffffff', border: 'none' }}>
              {superAdmins.length} Aktif Süper Admin
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20 }}>
            Söz konusu kullanıcılar tüm SaaS sisteminin sahibi olup, kiracı firmaları, lisans paketlerini ve SaaS Yönetimi panelini görmeye yetkilidir. Müşteri (Kiracı) kullanıcılarına kesinlikle Süper Admin yetkisi verilemez.
          </p>

          {/* SUPER ADMIN LIST GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 24 }}>
            {superAdmins.map((sa) => (
              <div
                key={sa.id}
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', display: 'block' }}>{sa.name}</strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 700 }}>✉️ {sa.email}</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Eklenme: {sa.addedAt}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-action-ghost"
                    style={{ padding: '4px 10px', fontSize: '0.76rem', color: '#6366f1' }}
                    onClick={() => setSuperAdminInviteUser(sa)}
                  >
                    ✉️ Davet Bağlantısı Al
                  </button>
                  <button
                    type="button"
                    className="btn-action-ghost"
                    style={{ padding: '4px 10px', fontSize: '0.76rem', color: '#ef4444' }}
                    onClick={() => handleRemoveSuperAdmin(sa.id, sa.name)}
                  >
                    🗑️ Yetkiyi Kaldır
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* FORM TO ADD NEW SUPERADMIN */}
          <form onSubmit={handleAddSuperAdmin} style={{ background: 'var(--surface-strong)', padding: 18, borderRadius: 14, border: '1px dashed var(--border)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-main)' }}>+ Yeni Süper Admin Ekle</h4>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="email"
                required
                placeholder="Süper Admin E-posta (Örn: yonetici@codentra.com.tr)"
                value={newSuperAdminEmail}
                onChange={(e) => setNewSuperAdminEmail(e.target.value)}
                style={{ flex: 1, minWidth: 240, padding: '9px 14px', fontSize: '0.86rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
              />
              <input
                type="text"
                placeholder="Ad Soyad / Unvan"
                value={newSuperAdminName}
                onChange={(e) => setNewSuperAdminName(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '9px 14px', fontSize: '0.86rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
              />
              <button type="submit" className="btn-action-primary" style={{ padding: '9px 20px', fontSize: '0.86rem', background: '#6366f1' }}>
                + Süper Admin Yetkisi Ver
              </button>
            </div>
          </form>
        </article>
      )}

      {/* Edit Email Template Modal */}
      {editingTemplate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 350,
            background: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '60px',
            paddingBottom: '40px',
            overflowY: 'auto'
          }}
          onClick={() => setEditingTemplate(null)}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 650, width: '100%', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">E-posta Özelleştirme</p>
                <h3>{editingTemplate.title}</h3>
              </div>
              <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setEditingTemplate(null)}>
                ✕ Kapat
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} style={{ display: 'grid', gap: 14 }}>
              <label className="select-field">
                <span>E-posta Konusu (Subject)</span>
                <input
                  type="text"
                  required
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                />
              </label>

              <label className="select-field">
                <span>E-posta Metni (Body)</span>
                <textarea
                  rows={8}
                  required
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                />
              </label>

              <div className="new-customer-actions">
                <button type="button" className="secondary-action" onClick={() => setEditingTemplate(null)}>
                  İptal
                </button>
                <button type="submit" className="primary-action">
                  Şablonu Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLIENT-FACING OFFER PREVIEW & ONLINE APPROVAL SIMULATION MODAL */}
      {previewOffer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 350,
            background: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '60px',
            paddingBottom: '40px',
            overflowY: 'auto'
          }}
          onClick={() => setPreviewOffer(null)}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 780, width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: 32, background: '#ffffff', color: '#1f2937' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '10px 16px', borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: 600 }}>
                👁️ MÜŞTERİ GÖZÜNDEN TEKLİF VE ONAY SİMÜLASYONU (Müşteri online linke bastığında bu ekranı görür)
              </span>
              <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setPreviewOffer(null)}>
                ✕ Kapat
              </button>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 28, background: '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e5e7eb', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, color: '#111827' }}>CODENTRA SaaS LİSANS TEKLİFİ</h2>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.9rem' }}>Teklif ve Sözleşme Yönetimi</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#374151', display: 'block' }}>{previewOffer.offerNumber}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Tarih: {previewOffer.createdAt}</span>
                  <br />
                  <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>Geçerlilik: {previewOffer.validUntil}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, fontSize: '0.9rem' }}>
                <div style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>TEKLİF VEREN FİRMA</span>
                  <h4 style={{ margin: '4px 0 2px', color: '#111827' }}>Codentra</h4>
                  <p style={{ margin: 0, color: '#4b5563' }}>Super Admin SaaS Destek Ekibi</p>
                </div>

                <div style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>TEKLİF SUNULAN MÜŞTERİ</span>
                  <h4 style={{ margin: '4px 0 2px', color: '#111827' }}>{previewOffer.tenantName}</h4>
                </div>
              </div>

              <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24 }}>
                <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: '1.15rem', color: '#111827' }}>
                  Önerilen Paket: {previewOffer.packageName} ({previewOffer.billingCycle} Faturalama)
                </h3>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 0', color: '#6b7280' }}>Lisans / Faturalama Tipi:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>{previewOffer.billingCycle} Ödemeli</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 0', color: '#6b7280' }}>Teklif Edilen Tutar:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, fontSize: '1.2rem', color: '#059669' }}>
                        ₺{previewOffer.billingCycle === 'Yıllık' ? previewOffer.annualFee.toLocaleString('tr-TR') : previewOffer.monthlyFee.toLocaleString('tr-TR')}
                        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}> / {previewOffer.billingCycle === 'Yıllık' ? 'yıl (İndirimli)' : 'ay'}</span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 0', color: '#6b7280' }}>Teklif Notu & Özel Koşullar:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontStyle: 'italic', color: '#4b5563' }}>{previewOffer.notes || 'Standart SaaS Kullanım Koşulları Geçerlidir.'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', color: '#6b7280' }}>Teklif Durumu:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.82rem', background: previewOffer.status === 'Kabul Edildi' ? '#d1fae5' : previewOffer.status === 'Pazarlıkta' ? '#fef3c7' : '#dbeafe', color: previewOffer.status === 'Kabul Edildi' ? '#047857' : previewOffer.status === 'Pazarlıkta' ? '#b45309' : '#1d4ed8' }}>
                          {previewOffer.status}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#fff', padding: 20, borderRadius: 12, border: '2px dashed #3b82f6' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8', textAlign: 'center' }}>
                  👇 MÜŞTERİ ONLINE AKSİYONAL BUTONLARI (Simüle Etmek İçin Tıklayın) 👇
                </span>

                {previewOffer.status !== 'Kabul Edildi' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button
                      type="button"
                      style={{ padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      onClick={() => handleConvertOfferToContract(previewOffer)}
                    >
                      ✅ Teklifi Kabul Et & Online Onayla
                    </button>

                    <button
                      type="button"
                      style={{ padding: '14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      onClick={() => handleClientRequestRevision(previewOffer)}
                    >
                      💬 Revizyon / Pazarlık Talebi Gönder
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#d1fae5', color: '#047857', padding: 14, borderRadius: 10, textAlign: 'center', fontWeight: 700 }}>
                    🎉 Bu teklif müşteri tarafından çevrimiçi olarak onaylanmış ve SaaS sözleşmesine dönüştürülmüştür.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Negotiated License Edit Modal */}
      {editingLicenseTenant && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 400,
            background: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '60px',
            paddingBottom: '40px',
            overflowY: 'auto'
          }}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 640, width: '100%', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Pazarlık & Güncelleme</p>
                <h3>{editingLicenseTenant.companyName} Anlaşmasını Düzenle</h3>
              </div>
              <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setEditingLicenseTenant(null)}>
                ✕ Kapat
              </button>
            </div>

            <form onSubmit={handleSaveLicenseEdit} className="new-customer-form" style={{ padding: 0 }}>
              <div className="new-customer-grid">
                <label className="select-field">
                  <span>Abonelik Durumu</span>
                  <select
                    value={licenseEditForm.status}
                    onChange={(e) => setLicenseEditForm({ ...licenseEditForm, status: e.target.value as SaaSSubscriptionStatus })}
                  >
                    <option value="Aday">Aday Müşteri (Lead)</option>
                    <option value="Demo">Demo / Deneme (14 Gün)</option>
                    <option value="Aktif">Aktif Müşteri</option>
                    <option value="Askıda">Askıda / Dondurulmuş</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Abonelik Paketi</span>
                  <select
                    value={licenseEditForm.package}
                    onChange={(e) => setLicenseEditForm({ ...licenseEditForm, package: e.target.value as SaaSPackage })}
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.name.split(' ')[0]}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="select-field">
                  <span>Faturalama Periyodu</span>
                  <select
                    value={licenseEditForm.billingCycle}
                    onChange={(e) =>
                      setLicenseEditForm({ ...licenseEditForm, billingCycle: e.target.value as '' | 'Aylık' | 'Yıllık' })
                    }
                  >
                    <option value="Aylık">Aylık Ödemeli</option>
                    <option value="Yıllık">Yıllık Ödemeli (İndirimli)</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Max Kullanıcı Limiti</span>
                  <input
                    type="number"
                    value={licenseEditForm.maxUsers}
                    onChange={(e) => setLicenseEditForm({ ...licenseEditForm, maxUsers: Number(e.target.value) })}
                  />
                </label>

                <label className="select-field">
                  <span>Pazarlık Edilen Aylık Ücret (₺)</span>
                  <input
                    type="number"
                    value={licenseEditForm.monthlyFee}
                    disabled={licenseEditForm.billingCycle === 'Yıllık'}
                    style={{ backgroundColor: licenseEditForm.billingCycle === 'Yıllık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLicenseEditForm({
                        ...licenseEditForm,
                        monthlyFee: val,
                        annualFee: val * 12
                      });
                    }}
                  />
                </label>

                <label className="select-field">
                  <span>Pazarlık Edilen Yıllık Ücret (₺)</span>
                  <input
                    type="number"
                    value={licenseEditForm.annualFee}
                    disabled={licenseEditForm.billingCycle === 'Aylık'}
                    style={{ backgroundColor: licenseEditForm.billingCycle === 'Aylık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLicenseEditForm({
                        ...licenseEditForm,
                        annualFee: val,
                        monthlyFee: Math.round(val / 12)
                      });
                    }}
                  />
                </label>

                <label className="select-field new-customer-full">
                  <span>Pazarlık & Anlaşma Notları</span>
                  <textarea
                    rows={3}
                    placeholder="Müşteri ile varılan özel fiyatlandırma ve koşul notları..."
                    value={licenseEditForm.notes}
                    onChange={(e) => setLicenseEditForm({ ...licenseEditForm, notes: e.target.value })}
                  />
                </label>
              </div>

              <div className="new-customer-actions">
                <button type="button" className="secondary-action" onClick={() => setEditingLicenseTenant(null)}>
                  İptal
                </button>
                <button type="submit" className="primary-action">
                  Anlaşmayı Kaydet & Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Detail Modal / Drawer */}
            {/* Tenant Detail Modal / Drawer */}
      {selectedTenant && editableTenant && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 200,
            background: 'rgba(17, 24, 39, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '60px',
            paddingBottom: '40px',
            overflowY: 'auto'
          }}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 840, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 28 }}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">{editableTenant.tenantCode} • Kiracı Yönetimi</p>
                <h3>{editableTenant.companyName}</h3>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="secondary-action"
                  onClick={() => {
                    setSelectedTenant(null);
                    setEditableTenant(null);
                  }}
                >
                  İptal
                </button>
                <button
                  className="primary-action"
                  onClick={() => {
                    setTenants(prev => {
                      const next = prev.map(t => t.id === editableTenant.id ? editableTenant : t);
                      saveCloudTenants(next);
                      return next;
                    });
                    setSelectedTenant(null);
                    setEditableTenant(null);
                  }}
                >
                  💾 Değişiklikleri Kaydet
                </button>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="filter-group" style={{ justifyContent: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
              <button className={`filter-chip ${detailTab === 'info' ? 'filter-chip-active' : ''}`} onClick={() => setDetailTab('info')}>
                🏢 Firma Bilgileri
              </button>
              <button className={`filter-chip ${detailTab === 'license' ? 'filter-chip-active' : ''}`} onClick={() => setDetailTab('license')}>
                🔑 Lisans & Paket
              </button>
              <button className={`filter-chip ${detailTab === 'offers' ? 'filter-chip-active' : ''}`} onClick={() => setDetailTab('offers')}>
                📄 Teklifler
              </button>
              <button className={`filter-chip ${detailTab === 'contracts' ? 'filter-chip-active' : ''}`} onClick={() => setDetailTab('contracts')}>
                📝 Sözleşmeler
              </button>
              <button className={`filter-chip ${detailTab === 'billing' ? 'filter-chip-active' : ''}`} onClick={() => setDetailTab('billing')}>
                💳 Faturalar
              </button>
              <button className={`filter-chip ${detailTab === 'users' ? 'filter-chip-active' : ''}`} onClick={() => setDetailTab('users')}>
                👥 Kullanıcılar
              </button>
            </div>

            {/* Tab Contents */}
            {detailTab === 'info' && (
              <div className="new-customer-grid" style={{ marginBottom: 20 }}>
                <label className="select-field">
                  <span>Firma Ünvanı</span>
                  <input type="text" value={editableTenant.companyName} onChange={e => setEditableTenant({ ...editableTenant, companyName: e.target.value })} />
                </label>
                <label className="select-field">
                  <span>Yetkili Ad Soyad</span>
                  <input type="text" value={editableTenant.contactName} onChange={e => setEditableTenant({ ...editableTenant, contactName: e.target.value })} />
                </label>
                <label className="select-field">
                  <span>E-posta Adresi</span>
                  <input type="email" value={editableTenant.email} onChange={e => setEditableTenant({ ...editableTenant, email: e.target.value })} />
                </label>
                <label className="select-field">
                  <span>Telefon</span>
                  <input type="text" value={editableTenant.phone} onChange={e => setEditableTenant({ ...editableTenant, phone: e.target.value })} />
                </label>
                <label className="select-field">
                  <span>Şehir</span>
                  <input type="text" value={editableTenant.city} onChange={e => setEditableTenant({ ...editableTenant, city: e.target.value })} />
                </label>
                <div className="select-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Firma Logosu</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {editableTenant.logoUrl ? (
                      <div style={{ position: 'relative', width: 64, height: 64, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', padding: 4 }}>
                        <img src={editableTenant.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <button type="button" onClick={() => setEditableTenant({ ...editableTenant, logoUrl: '' })} style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ width: 64, height: 64, border: '1px dashed var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 24 }}>
                        🏢
                      </div>
                    )}
                    <div>
                      <label className="secondary-action" style={{ display: 'inline-block', cursor: 'pointer', marginBottom: 8 }}>
                        Logo Yükle
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setEditableTenant({ ...editableTenant, logoUrl: ev.target?.result as string });
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Önerilen: 200x200px (PNG, JPG). Maks 2MB.</p>
                    </div>
                  </div>
                </div>
                <label className="select-field">
                  <span>Abonelik Durumu</span>
                  <select value={editableTenant.status} onChange={e => setEditableTenant({ ...editableTenant, status: e.target.value as any })}>
                    <option value="Aday">Aday Müşteri</option>
                    <option value="Demo">Demo / Deneme</option>
                    <option value="Aktif">Aktif Abonelik</option>
                    <option value="Askıda">Askıda / Dondurulmuş</option>
                    <option value="İptal">İptal Edilmiş</option>
                  </select>
                </label>
                
                <div style={{ gridColumn: '1 / -1', marginTop: 20 }}>
                  <div className="module-card module-card-flat" style={{ padding: 18 }}>
                    <p className="eyebrow">Aktivasyon & Davet Takibi</p>
                    <h4 style={{ margin: '4px 0 8px' }}>Durum: {editableTenant.activationStatus || 'Davet Gönderilmedi'}</h4>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button className="primary-action" style={{ fontSize: '0.85rem' }} onClick={() => handleSendInvitation(editableTenant.id, editableTenant.email, editableTenant.companyName)}>
                        ✉️ Davet & Şifre Bağlantısı Gönder
                      </button>
                      <button className="secondary-action" style={{ fontSize: '0.85rem' }} onClick={() => handleCopyInviteLink(editableTenant.id)}>
                        📋 Magic Link Kopyala
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'license' && (
              <div className="new-customer-grid" style={{ marginBottom: 20 }}>
                <label className="select-field">
                  <span>Paket Seçimi</span>
                  <select value={editableTenant.package} onChange={e => setEditableTenant({ ...editableTenant, package: e.target.value as any })}>
                    {packages.map(p => (
                      <option key={p.id} value={p.name.split(' ')[0]}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="select-field">
                  <span>Kullanıcı Limiti</span>
                  <input type="number" value={editableTenant.maxUsers} onChange={e => setEditableTenant({ ...editableTenant, maxUsers: Number(e.target.value) })} />
                </label>
                <label className="select-field">
                  <span>Ödeme Döngüsü</span>
                  <select value={editableTenant.billingCycle} onChange={e => {
                    const cycle = e.target.value as any;
                    setEditableTenant({ ...editableTenant, billingCycle: cycle });
                  }}>
                    <option value="Aylık">Aylık</option>
                    <option value="Yıllık">Yıllık</option>
                  </select>
                </label>
                <label className="select-field">
                  <span>Aylık Tutar (₺)</span>
                  <input type="number" value={editableTenant.monthlyFee} onChange={e => {
                    const val = Number(e.target.value);
                    setEditableTenant({ ...editableTenant, monthlyFee: val, annualFee: editableTenant.billingCycle === 'Yıllık' ? val * 12 : editableTenant.annualFee });
                  }} />
                </label>
                <label className="select-field">
                  <span>Yıllık Tutar (₺)</span>
                  <input type="number" value={editableTenant.annualFee} disabled={editableTenant.billingCycle === 'Aylık'} style={{ backgroundColor: editableTenant.billingCycle === 'Aylık' ? '#1e293b' : undefined }} onChange={e => setEditableTenant({ ...editableTenant, annualFee: Number(e.target.value) })} />
                </label>
                <label className="select-field">
                  <span>Ödeme Durumu</span>
                  <select value={editableTenant.paymentStatus} onChange={e => setEditableTenant({ ...editableTenant, paymentStatus: e.target.value as any })}>
                    <option value="Sorunsuz">Sorunsuz</option>
                    <option value="Bekliyor">Bekliyor</option>
                    <option value="Gecikmede">Gecikmede</option>
                  </select>
                </label>
                <label className="select-field">
                  <span>Sağlık Durumu</span>
                  <select value={editableTenant.healthStatus} onChange={e => setEditableTenant({ ...editableTenant, healthStatus: e.target.value as any })}>
                    <option value="Mükemmel">Mükemmel</option>
                    <option value="İyi">İyi</option>
                    <option value="Riskli">Riskli</option>
                  </select>
                </label>
                <label className="select-field new-customer-full">
                  <span>Anlaşma Notları</span>
                  <textarea rows={3} value={editableTenant.notes} onChange={e => setEditableTenant({ ...editableTenant, notes: e.target.value })} />
                </label>
              </div>
            )}

            {detailTab === 'offers' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4>Kiracıya Ait Teklifler</h4>
                  <button className="primary-action" onClick={() => {
                    setOfferForm({
                      tenantId: editableTenant.id,
                      packageName: editableTenant.package || 'Pro',
                      billingCycle: editableTenant.billingCycle === 'Yıllık' ? 'Yıllık' : 'Aylık',
                      monthlyFee: editableTenant.monthlyFee || 14500,
                      annualFee: editableTenant.annualFee || 145000,
                      validDays: 14,
                      notes: ''
                    });
                    setIsOfferModalOpen(true);
                  }}>+ Yeni Teklif Oluştur</button>
                </div>
                {offers.filter(o => o.tenantId === editableTenant.id).length > 0 ? (
                  <div className="customer-table-wrap">
                    <table className="customer-table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Paket</th>
                          <th>Tutar</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offers.filter(o => o.tenantId === editableTenant.id).map(o => (
                          <tr key={o.id}>
                            <td>{o.createdAt}</td>
                            <td>{o.packageName} ({o.billingCycle})</td>
                            <td>₺{(o.annualFee || o.monthlyFee).toLocaleString('tr-TR')}</td>
                            <td><span className="mini-badge">{o.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="form-hint">Bu kiracıya ait teklif bulunmamaktadır.</p>
                )}
              </div>
            )}

            {detailTab === 'contracts' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4>Abonelik Sözleşmeleri</h4>
                  <button className="primary-action" onClick={() => {
                    setContractForm({
                      tenantId: editableTenant.id,
                      packageName: editableTenant.package || 'Pro',
                      billingCycle: editableTenant.billingCycle === 'Yıllık' ? 'Yıllık' : 'Aylık',
                      monthlyFee: editableTenant.monthlyFee || 14500,
                      annualFee: editableTenant.annualFee || 145000,
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      notes: ''
                    });
                    setIsContractModalOpen(true);
                  }}>+ Yeni Sözleşme Oluştur</button>
                </div>
                {contracts.filter(c => c.tenantId === editableTenant.id).length > 0 ? (
                  <div className="customer-table-wrap">
                    <table className="customer-table">
                      <thead>
                        <tr>
                          <th>Sözleşme No</th>
                          <th>Paket</th>
                          <th>Başlangıç</th>
                          <th>Bitiş</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contracts.filter(c => c.tenantId === editableTenant.id).map(c => (
                          <tr key={c.id}>
                            <td>{c.contractNumber}</td>
                            <td>{c.packageName} ({c.billingCycle})</td>
                            <td>{c.startDate}</td>
                            <td>{c.endDate}</td>
                            <td><span className="mini-badge">{c.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="form-hint">Bu kiracıya ait sözleşme bulunmamaktadır.</p>
                )}
              </div>
            )}

            {detailTab === 'billing' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4>Faturalar</h4>
                  <button className="primary-action" onClick={() => {
                    // Logic to open invoice modal (placeholder)
                    alert('Fatura kesme modülü yakında eklenecek.');
                  }}>+ Yeni Fatura Kes</button>
                </div>
                {invoices.filter(i => i.tenantId === editableTenant.id).length > 0 ? (
                  <div className="customer-table-wrap">
                    <table className="customer-table">
                      <thead>
                        <tr>
                          <th>Fatura No</th>
                          <th>Dönem</th>
                          <th>Tutar</th>
                          <th>Vade</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.filter(i => i.tenantId === editableTenant.id).map(inv => (
                          <tr key={inv.id}>
                            <td><strong>{inv.invoiceNumber}</strong></td>
                            <td>{inv.billingPeriod}</td>
                            <td>₺{inv.amount.toLocaleString('tr-TR')}</td>
                            <td>{inv.dueDate}</td>
                            <td><span className="mini-badge">{inv.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="form-hint">Bu kiracı için fatura kaydı bulunmamaktadır.</p>
                )}
              </div>
            )}

            {detailTab === 'users' && (() => {
              let usersMap: any = {};
              try { usersMap = JSON.parse(localStorage.getItem('crm_tenant_users_map_v2') || '{}'); } catch(e) {}
              const tUsers = usersMap[editableTenant.id] || [];
              
              const handleAddOrInviteUser = (e: any, isInvite: boolean) => {
                e.preventDefault();
                const form = e.currentTarget.closest('form');
                const fd = new FormData(form);
                const name = fd.get('name') as string;
                const email = fd.get('email') as string;
                const role = fd.get('role') as string;
                
                const newUser = { id: `u-${Date.now()}`, name, email, role, invited: isInvite };
                usersMap[editableTenant.id] = [...tUsers, newUser];
                localStorage.setItem('crm_tenant_users_map_v2', JSON.stringify(usersMap));
                
                form.reset();
                setDetailTab('notes'); setTimeout(() => setDetailTab('users'), 0);
                if (isInvite) alert(`${email} adresine davet gönderildi.`);
                else alert(`${name} (${email}) sisteme eklendi.`);
              };

              const handleSendInviteLater = (usr: any) => {
                usersMap[editableTenant.id] = tUsers.map((u: any) => u.id === usr.id ? { ...u, invited: true } : u);
                localStorage.setItem('crm_tenant_users_map_v2', JSON.stringify(usersMap));
                setDetailTab('notes'); setTimeout(() => setDetailTab('users'), 0);
                alert(`${usr.email} adresine davet gönderildi.`);
              };

              const handleDeleteUser = (usr: any) => {
                if (window.confirm(`"${usr.name}" kullanıcısını silmek istediğinize emin misiniz?`)) {
                   usersMap[editableTenant.id] = tUsers.filter((u: any) => u.id !== usr.id);
                   localStorage.setItem('crm_tenant_users_map_v2', JSON.stringify(usersMap));
                   
                   try {
                     const passMap = JSON.parse(localStorage.getItem('crm_user_passwords_map') || '{}');
                     if (passMap[usr.email]) { delete passMap[usr.email]; localStorage.setItem('crm_user_passwords_map', JSON.stringify(passMap)); }
                   } catch(e) {}
                   
                   setDetailTab('notes'); setTimeout(() => setDetailTab('users'), 0);
                }
              };

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <h4 style={{ marginBottom: 16 }}>Sistem Kullanıcıları</h4>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ background: 'var(--surface-strong)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>{editableTenant.contactName} (Ana Yetkili)</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{editableTenant.email} | Admin</span>
                      </div>
                      {tUsers.map((usr: any) => (
                        <div key={usr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-strong)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.95rem' }}>{usr.name}</strong>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{usr.email} | {usr.role}</span>
                            {usr.invited && <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'block', marginTop: 2 }}>✓ Davet Edildi</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {!usr.invited && (
                              <button className="btn-action-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => handleSendInviteLater(usr)}>Davet Gönder</button>
                            )}
                            <button className="btn-action-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px', color: '#ef4444' }} onClick={() => handleDeleteUser(usr)}>Sil</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ marginBottom: 16 }}>Yeni Kullanıcı Ekle</h4>
                    <form className="new-customer-form" style={{ padding: 16, background: 'var(--surface-strong)', borderRadius: 10 }}>
                      <div className="new-customer-grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
                        <label className="select-field">
                          <span>Ad Soyad</span>
                          <input type="text" name="name" required />
                        </label>
                        <label className="select-field">
                          <span>E-posta Adresi</span>
                          <input type="email" name="email" required />
                        </label>
                        <label className="select-field">
                          <span>Yetki Rolü</span>
                          <select name="role" defaultValue="Admin">
                            <option value="Admin">Admin (Tam Yetki)</option>
                            <option value="Standart Kullanıcı">Standart Kullanıcı</option>
                            <option value="Sadece Görüntüleme">Sadece Görüntüleme</option>
                          </select>
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                        <button type="button" className="secondary-action" style={{ flex: 1 }} onClick={(e) => handleAddOrInviteUser(e, false)}>
                          Kullanıcı Ekle
                        </button>
                        <button type="button" className="primary-action" style={{ flex: 1 }} onClick={(e) => handleAddOrInviteUser(e, true)}>
                          Ekle ve Davet Gönder
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              );
            })()}

            <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-action-primary"
                onClick={() => {
                  if (onImpersonateTenant) onImpersonateTenant(editableTenant);
                  else if (onNavigateSection) onNavigateSection('customers');
                }}
              >
                🚀 Kiracı CRM'ine Geç →
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Add New Tenant Modal */}
      {isAddModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 680, width: '100%', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Yeni SaaS Kiracısı</p>
                <h3>Tenant Hesabı Tanımla</h3>
              </div>
              <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setIsAddModalOpen(false)}>
                ✕ Kapat
              </button>
            </div>

            <form onSubmit={handleAddTenantSubmit} className="new-customer-form" style={{ padding: 0 }}>
              <div className="new-customer-grid">
                <label className="select-field">
                  <span>Firma Ünvanı *</span>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Kuzey İSG OSGB Ltd."
                    value={newForm.companyName}
                    onChange={(e) => setNewForm({ ...newForm, companyName: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Yetkili Ad Soyad *</span>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Mehmet Özkan"
                    value={newForm.contactName}
                    onChange={(e) => setNewForm({ ...newForm, contactName: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>E-posta Adresi *</span>
                  <input
                    type="email"
                    required
                    placeholder="mehmet@kuzeyosgb.com"
                    value={newForm.email}
                    onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Telefon</span>
                  <input
                    type="text"
                    placeholder="0212 123 45 67"
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Şehir</span>
                  <input
                    type="text"
                    value={newForm.city}
                    onChange={(e) => setNewForm({ ...newForm, city: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Abonelik Durumu</span>
                  <select
                    value={newForm.status}
                    onChange={(e) => {
                      const st = e.target.value as SaaSSubscriptionStatus;
                      if (st === 'Aday') {
                        setNewForm({
                          ...newForm,
                          status: st,
                          package: '',
                          billingCycle: '',
                          monthlyFee: '',
                          annualFee: '',
                          maxUsers: ''
                        });
                      } else {
                        setNewForm({
                          ...newForm,
                          status: st,
                          billingCycle: newForm.billingCycle || 'Aylık'
                        });
                      }
                    }}
                  >
                    <option value="Aday">Aday Müşteri (Lead)</option>
                    <option value="Demo">Demo / Deneme (14 Gün)</option>
                    <option value="Aktif">Aktif Müşteri</option>
                    <option value="Askıda">Askıda / Dondurulmuş</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Abonelik Paketi</span>
                  <select
                    value={newForm.package}
                    onChange={(e) => {
                      const pkgName = e.target.value as SaaSPackage;
                      if (!pkgName) {
                        setNewForm({ ...newForm, package: '', monthlyFee: '', annualFee: '', maxUsers: '' });
                        return;
                      }
                      const selectedPkg = packages.find((p) => p.name.startsWith(pkgName));
                      const mFee = selectedPkg ? selectedPkg.monthlyFee : 14500;
                      const aFee = selectedPkg ? selectedPkg.annualFee : 145000;
                      const users = selectedPkg ? selectedPkg.maxUsers : 15;
                      setNewForm({
                        ...newForm,
                        package: pkgName,
                        billingCycle: newForm.billingCycle || 'Aylık',
                        monthlyFee: newForm.billingCycle === 'Yıllık' ? Math.round(aFee / 12) : mFee,
                        annualFee: aFee,
                        maxUsers: users
                      });
                    }}
                  >
                    <option value="">-- Paket Seçilmedi (Aday Müşteri) --</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.name.split(' ')[0]}>
                        {pkg.name} ({pkg.maxUsers} Kullanıcı)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="select-field">
                  <span>Faturalama Periyodu</span>
                  <select
                    value={newForm.billingCycle}
                    onChange={(e) => {
                      const cycle = e.target.value as '' | 'Aylık' | 'Yıllık';
                      let mFee = newForm.monthlyFee;
                      let aFee = newForm.annualFee;

                      if (cycle === 'Yıllık' && mFee && !aFee) {
                        aFee = Number(mFee) * 10;
                      } else if (cycle === 'Aylık' && aFee && !mFee) {
                        mFee = Math.round(Number(aFee) / 12);
                      }

                      setNewForm({ ...newForm, billingCycle: cycle, monthlyFee: mFee, annualFee: aFee });
                    }}
                  >
                    <option value="">-- Periyot Seçilmedi (Aday) --</option>
                    <option value="Aylık">Aylık Ödemeli</option>
                    <option value="Yıllık">Yıllık Ödemeli (2 Ay İndirimli)</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Max Kullanıcı Limiti</span>
                  <input
                    type="number"
                    placeholder="Boş bırakılabilir"
                    value={newForm.maxUsers}
                    onChange={(e) => setNewForm({ ...newForm, maxUsers: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Aylık Ücret (₺)</span>
                  <input
                    type="number"
                    placeholder="Boş bırakılabilir"
                    value={newForm.monthlyFee}
                    disabled={newForm.billingCycle === 'Yıllık'}
                    style={{ backgroundColor: newForm.billingCycle === 'Yıllık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = Number(val);
                      setNewForm({
                        ...newForm,
                        monthlyFee: val,
                        annualFee: val ? num * 12 : ''
                      });
                    }}
                  />
                </label>

                <label className="select-field">
                  <span>Yıllık Lisans Ücreti (₺)</span>
                  <input
                    type="number"
                    placeholder="Boş bırakılabilir"
                    value={newForm.annualFee}
                    disabled={newForm.billingCycle === 'Aylık'}
                    style={{ backgroundColor: newForm.billingCycle === 'Aylık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = Number(val);
                      setNewForm({
                        ...newForm,
                        annualFee: val,
                        monthlyFee: val ? Math.round(num / 12) : ''
                      });
                    }}
                  />
                </label>

                <label className="select-field new-customer-full">
                  <span>Kiracı Logosu (Görsel veya Yükleme)</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="https://... veya dosya seçin"
                      value={newForm.logoUrl}
                      onChange={(e) => setNewForm({ ...newForm, logoUrl: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <label className="btn-action-ghost" style={{ cursor: 'pointer', margin: 0, padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      📁 Görsel Yükle
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const resizedDataUrl = await resizeImageBase64(file, 200, 200);
                              setNewForm({ ...newForm, logoUrl: resizedDataUrl });
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  {newForm.logoUrl && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={newForm.logoUrl} alt="Logo Önizleme" style={{ height: 40, maxWidth: 140, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', padding: 4 }} />
                      <button type="button" className="btn-action-ghost" style={{ fontSize: '0.78rem', color: '#ef4444' }} onClick={() => setNewForm({ ...newForm, logoUrl: '' })}>
                        ✕ Logoyu Kaldır
                      </button>
                    </div>
                  )}
                </label>

                <label className="select-field new-customer-full">
                  <span>Özel Notlar</span>
                  <textarea
                    rows={3}
                    placeholder="Görüşme veya anlaşma detayları..."
                    value={newForm.notes}
                    onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  />
                </label>
              </div>

              <div className="new-customer-actions">
                <button type="button" className="secondary-action" onClick={() => setIsAddModalOpen(false)}>
                  İptal
                </button>
                <button type="submit" className="primary-action">
                  Kiracıyı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {isEditTenantModalOpen && editingTenantForEdit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
          onClick={() => setIsEditTenantModalOpen(false)}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 720, width: '100%', padding: 28, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Kiracı Bilgileri & Logo Güncelleme</p>
                <h3>{editingTenantForEdit.companyName} — Düzenle</h3>
              </div>
              <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setIsEditTenantModalOpen(false)}>
                ✕ Kapat
              </button>
            </div>

            <form onSubmit={handleSaveEditTenantSubmit} className="new-customer-form" style={{ padding: 0 }}>
              <div className="new-customer-grid">
                <label className="select-field">
                  <span>Firma Ünvanı *</span>
                  <input
                    type="text"
                    required
                    value={editTenantForm.companyName}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, companyName: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Yetkili Ad Soyad *</span>
                  <input
                    type="text"
                    required
                    value={editTenantForm.contactName}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, contactName: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>E-posta Adresi *</span>
                  <input
                    type="email"
                    required
                    value={editTenantForm.email}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, email: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Telefon</span>
                  <input
                    type="text"
                    value={editTenantForm.phone}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, phone: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Şehir</span>
                  <input
                    type="text"
                    value={editTenantForm.city}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, city: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Abonelik Durumu</span>
                  <select
                    value={editTenantForm.status}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, status: e.target.value as SaaSSubscriptionStatus })}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Demo">Demo / Deneme</option>
                    <option value="Aday">Aday Müşteri</option>
                    <option value="Askıda">Askıda / Dondurulmuş</option>
                    <option value="İptal">İptal Edilmiş</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Ödeme Sağlık Durumu</span>
                  <select
                    value={editTenantForm.paymentStatus}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, paymentStatus: e.target.value as SaaSPaymentStatus })}
                  >
                    <option value="Sorunsuz">Sorunsuz</option>
                    <option value="Bekliyor">Ödeme Bekliyor</option>
                    <option value="Gecikmede">Gecikmede / İhtar</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Abonelik Paketi</span>
                  <select
                    value={editTenantForm.package}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, package: e.target.value as SaaSPackage })}
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.name.split(' ')[0]}>
                        {pkg.name} ({pkg.maxUsers} Kullanıcı)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="select-field">
                  <span>Faturalama Periyodu</span>
                  <select
                    value={editTenantForm.billingCycle}
                    onChange={(e) => {
                      const cycle = e.target.value as '' | 'Aylık' | 'Yıllık';
                      let mFee = editTenantForm.monthlyFee;
                      let aFee = editTenantForm.annualFee;

                      if (cycle === 'Yıllık' && mFee && !aFee) {
                        aFee = Number(mFee) * 10;
                      } else if (cycle === 'Aylık' && aFee && !mFee) {
                        mFee = Math.round(Number(aFee) / 12);
                      }

                      setEditTenantForm({ ...editTenantForm, billingCycle: cycle, monthlyFee: mFee, annualFee: aFee });
                    }}
                  >
                    <option value="Aylık">Aylık Ödemeli</option>
                    <option value="Yıllık">Yıllık Ödemeli</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Kullanıcı Limiti</span>
                  <input
                    type="number"
                    value={editTenantForm.maxUsers}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, maxUsers: Number(e.target.value) })}
                  />
                </label>

                <label className="select-field">
                  <span>Aylık Ücret (₺)</span>
                  <input
                    type="number"
                    value={editTenantForm.monthlyFee}
                    disabled={editTenantForm.billingCycle === 'Yıllık'}
                    style={{ backgroundColor: editTenantForm.billingCycle === 'Yıllık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditTenantForm({
                        ...editTenantForm,
                        monthlyFee: val,
                        annualFee: val ? val * 12 : 0
                      });
                    }}
                  />
                </label>

                <label className="select-field">
                  <span>Yıllık Ücret (₺)</span>
                  <input
                    type="number"
                    value={editTenantForm.annualFee}
                    disabled={editTenantForm.billingCycle === 'Aylık'}
                    style={{ backgroundColor: editTenantForm.billingCycle === 'Aylık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditTenantForm({
                        ...editTenantForm,
                        annualFee: val,
                        monthlyFee: val ? Math.round(val / 12) : 0
                      });
                    }}
                  />
                </label>

                <label className="select-field new-customer-full">
                  <span>Kiracı Logosu (Görsel veya Yükleme)</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="https://... veya bilgisayarınızdan dosya seçin"
                      value={editTenantForm.logoUrl}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, logoUrl: e.target.value })}
                      style={{ flex: 1 }}
                    />
                    <label className="btn-action-ghost" style={{ cursor: 'pointer', margin: 0, padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      📁 Görsel Yükle
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const resizedDataUrl = await resizeImageBase64(file, 200, 200);
                              setEditTenantForm({ ...editTenantForm, logoUrl: resizedDataUrl });
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  {editTenantForm.logoUrl && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={editTenantForm.logoUrl} alt="Logo Önizleme" style={{ height: 40, maxWidth: 140, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', padding: 4 }} />
                      <button type="button" className="btn-action-ghost" style={{ fontSize: '0.78rem', color: '#ef4444' }} onClick={() => setEditTenantForm({ ...editTenantForm, logoUrl: '' })}>
                        ✕ Logoyu Kaldır
                      </button>
                    </div>
                  )}
                </label>

                <label className="select-field new-customer-full">
                  <span>Notlar</span>
                  <textarea
                    rows={3}
                    value={editTenantForm.notes}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, notes: e.target.value })}
                  />
                </label>
              </div>

              <div className="new-customer-actions">
                <button type="button" className="secondary-action" onClick={() => setIsEditTenantModalOpen(false)}>
                  İptal
                </button>
                <button type="submit" className="primary-action">
                  ✅ Güncellemeleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* SaaS Offer Modal */}
      {isOfferModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
          onClick={() => setIsOfferModalOpen(false)}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 600, width: '100%', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Lisans Teklifi</p>
                <h3>SaaS Teklifi Oluştur</h3>
              </div>
              <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setIsOfferModalOpen(false)}>
                ✕ Kapat
              </button>
            </div>

            <form onSubmit={handleAddOfferSubmit} style={{ display: 'grid', gap: 14 }}>
              <label className="select-field">
                <span>Hedef Kiracı Firma</span>
                <select
                  value={offerForm.tenantId}
                  onChange={(e) => setOfferForm({ ...offerForm, tenantId: e.target.value })}
                >
                  <option value="">-- Yeni Aday veya Mevcut Kiracı --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.companyName} ({t.package || 'Aday Müşteri'})
                    </option>
                  ))}
                </select>
              </label>

              <div className="new-customer-grid">
                <label className="select-field">
                  <span>Önerilen Paket</span>
                  <select
                    value={offerForm.packageName}
                    onChange={(e) => {
                      const pkgName = e.target.value as SaaSPackage;
                      const selectedPkg = packages.find((p) => p.name.startsWith(pkgName));
                      const mFee = selectedPkg ? selectedPkg.monthlyFee : 14500;
                      const aFee = selectedPkg ? selectedPkg.annualFee : 145000;
                      setOfferForm({
                        ...offerForm,
                        packageName: pkgName,
                        monthlyFee: mFee,
                        annualFee: aFee
                      });
                    }}
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.name.split(' ')[0]}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="select-field">
                  <span>Faturalama Periyodu</span>
                  <select
                    value={offerForm.billingCycle}
                    onChange={(e) => {
                      const cycle = e.target.value as 'Aylık' | 'Yıllık';
                      let mFee = offerForm.monthlyFee;
                      let aFee = offerForm.annualFee;

                      if (cycle === 'Yıllık' && mFee && !aFee) {
                        aFee = Number(mFee) * 10;
                      } else if (cycle === 'Aylık' && aFee && !mFee) {
                        mFee = Math.round(Number(aFee) / 12);
                      }

                      setOfferForm({ ...offerForm, billingCycle: cycle, monthlyFee: mFee, annualFee: aFee });
                    }}
                  >
                    <option value="Yıllık">Yıllık (İndirimli)</option>
                    <option value="Aylık">Aylık</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Teklif Edilen Aylık Ücret (₺)</span>
                  <input
                    type="number"
                    value={offerForm.monthlyFee}
                    disabled={offerForm.billingCycle === 'Yıllık'}
                    style={{ backgroundColor: offerForm.billingCycle === 'Yıllık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setOfferForm({
                        ...offerForm,
                        monthlyFee: val,
                        annualFee: val * 12
                      });
                    }}
                  />
                </label>

                <label className="select-field">
                  <span>Teklif Edilen Yıllık Ücret (₺)</span>
                  <input
                    type="number"
                    value={offerForm.annualFee}
                    disabled={offerForm.billingCycle === 'Aylık'}
                    style={{ backgroundColor: offerForm.billingCycle === 'Aylık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setOfferForm({
                        ...offerForm,
                        annualFee: val,
                        monthlyFee: Math.round(val / 12)
                      });
                    }}
                  />
                </label>

                <label className="select-field">
                  <span>Teklif Geçerlilik Süresi (Gün)</span>
                  <input
                    type="number"
                    value={offerForm.validDays}
                    onChange={(e) => setOfferForm({ ...offerForm, validDays: Number(e.target.value) })}
                  />
                </label>
              </div>

              <label className="select-field">
                <span>Teklif Notları & Koşulları</span>
                <textarea
                  rows={2}
                  placeholder="İndirim oranları, dahil edilen özel hizmetler..."
                  value={offerForm.notes}
                  onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                />
              </label>

              <div className="new-customer-actions">
                <button type="button" className="secondary-action" onClick={() => setIsOfferModalOpen(false)}>
                  İptal
                </button>
                <button type="submit" className="primary-action">
                  SaaS Teklifi Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SaaS Contract Modal */}
      {isContractModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 600, width: '100%', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Lisans Anlaşması</p>
                <h3>Sıfırdan SaaS Sözleşmesi Tanımla</h3>
              </div>
              <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setIsContractModalOpen(false)}>
                ✕ Kapat
              </button>
            </div>

            <form onSubmit={handleAddContractSubmit} style={{ display: 'grid', gap: 14 }}>
              <label className="select-field">
                <span>Hedef Kiracı Firma</span>
                <select
                  required
                  value={contractForm.tenantId}
                  onChange={(e) => setContractForm({ ...contractForm, tenantId: e.target.value })}
                >
                  <option value="">-- Mevcut Kiracı Seçin --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.companyName} ({t.package || 'Aday Müşteri'} - {t.status})
                    </option>
                  ))}
                </select>
              </label>

              <div className="new-customer-grid">
                <label className="select-field">
                  <span>Abonelik Paketi</span>
                  <select
                    value={contractForm.packageName}
                    onChange={(e) => {
                      const pkgName = e.target.value as SaaSPackage;
                      const selectedPkg = packages.find((p) => p.name.startsWith(pkgName));
                      const mFee = selectedPkg ? selectedPkg.monthlyFee : 14500;
                      const aFee = selectedPkg ? selectedPkg.annualFee : 145000;
                      setContractForm({
                        ...contractForm,
                        packageName: pkgName,
                        monthlyFee: mFee,
                        annualFee: aFee
                      });
                    }}
                  >
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.name.split(' ')[0]}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="select-field">
                  <span>Faturalama Periyodu</span>
                  <select
                    value={contractForm.billingCycle}
                    onChange={(e) => {
                      const cycle = e.target.value as 'Aylık' | 'Yıllık';
                      let mFee = contractForm.monthlyFee;
                      let aFee = contractForm.annualFee;

                      if (cycle === 'Yıllık' && mFee && !aFee) {
                        aFee = Number(mFee) * 10;
                      } else if (cycle === 'Aylık' && aFee && !mFee) {
                        mFee = Math.round(Number(aFee) / 12);
                      }

                      setContractForm({ ...contractForm, billingCycle: cycle, monthlyFee: mFee, annualFee: aFee });
                    }}
                  >
                    <option value="Yıllık">Yıllık (İndirimli)</option>
                    <option value="Aylık">Aylık</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Aylık Ücret (₺)</span>
                  <input
                    type="number"
                    value={contractForm.monthlyFee}
                    disabled={contractForm.billingCycle === 'Yıllık'}
                    style={{ backgroundColor: contractForm.billingCycle === 'Yıllık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setContractForm({
                        ...contractForm,
                        monthlyFee: val,
                        annualFee: val * 12
                      });
                    }}
                  />
                </label>

                <label className="select-field">
                  <span>Yıllık Ücret (₺)</span>
                  <input
                    type="number"
                    value={contractForm.annualFee}
                    disabled={contractForm.billingCycle === 'Aylık'}
                    style={{ backgroundColor: contractForm.billingCycle === 'Aylık' ? '#1e293b' : undefined }}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setContractForm({
                        ...contractForm,
                        annualFee: val,
                        monthlyFee: Math.round(val / 12)
                      });
                    }}
                  />
                </label>

                <label className="select-field">
                  <span>Sözleşme Başlangıç Tarihi</span>
                  <input
                    type="date"
                    required
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Sözleşme Bitiş Tarihi</span>
                  <input
                    type="date"
                    required
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                  />
                </label>
              </div>

              <label className="select-field">
                <span>Özel Koşullar & Notlar</span>
                <textarea
                  rows={2}
                  placeholder="Sözleşmeye ait özel notlar veya anlaşma detayları..."
                  value={contractForm.notes}
                  onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                />
              </label>

              <div className="new-customer-actions">
                <button type="button" className="secondary-action" onClick={() => setIsContractModalOpen(false)}>
                  İptal
                </button>
                <button type="submit" className="primary-action">
                  Sözleşmeyi Kaydet ve Etkinleştir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPER ADMIN INVITATION MODAL */}
      {superAdminInviteUser &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20
            }}
            onClick={() => setSuperAdminInviteUser(null)}
          >
            <div
              className="panel panel-wide panel-elevated"
              style={{ maxWidth: 540, width: '100%', padding: 28, background: '#ffffff', color: '#1f2937', borderRadius: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.6rem' }}>🛡️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#6366f1' }}>SaaS Süper Admin Davet & Giriş Altyapısı</h3>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{superAdminInviteUser.name} ({superAdminInviteUser.email})</span>
                  </div>
                </div>
                <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setSuperAdminInviteUser(null)}>
                  ✕ Kapat
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <strong style={{ color: '#1e293b', display: 'block', marginBottom: 4 }}>📌 Yeni Süper Admin Nasıl Giriş Yapacak?</strong>
                  <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
                    1. Süper Admin olarak tanımlanan kişiye özel aktivasyon linki e-posta ile otomatik iletilir.<br />
                    2. Linke tıklayan yeni Süper Admin, kendi güvenli şifresini belirler.<br />
                    3. Ardından <strong>https://app.codentra.com.tr</strong> adresinden e-postası ve belirlediği şifresiyle sisteme giriş yapar.
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                    📋 Özel Aktivasyon & Şifre Belirleme Bağlantısı:
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      readOnly
                      value={`https://app.codentra.com.tr/superadmin-invite?email=${encodeURIComponent(superAdminInviteUser.email)}`}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      style={{ padding: '8px 14px', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => {
                        const link = `https://app.codentra.com.tr/superadmin-invite?email=${encodeURIComponent(superAdminInviteUser.email)}`;
                        navigator.clipboard?.writeText(link);
                        alert(`📋 Süper Admin Davet Bağlantısı Kopyalandı:\n\n${link}`);
                      }}
                    >
                      Kopyala
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    style={{ padding: '10px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                    onClick={() => {
                      setSuperAdminInviteUser(null);
                      setPasswordSetupUser({
                        name: superAdminInviteUser.name,
                        email: superAdminInviteUser.email,
                        role: 'Süper Admin (Sistem Sahibi)'
                      });
                      setPasswordForm({ password: '', confirmPassword: '' });
                    }}
                  >
                    🔑 İlk Giriş & Şifre Belirleme Ekranını Test Et →
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PASSWORD CREATION & FIRST LOGIN SIMULATION MODAL WITH SHOW/HIDE EYE TOGGLE */}
      {passwordSetupUser &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20
            }}
            onClick={() => setPasswordSetupUser(null)}
          >
            <div
              className="panel panel-wide panel-elevated"
              style={{ maxWidth: 520, width: '100%', padding: 28, background: '#ffffff', color: '#1f2937', borderRadius: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '10px 16px', borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#4338ca', fontWeight: 700 }}>
                  🛡️ SÜPER ADMİN ŞİFRE BELİRLEME SİMÜLASYONU
                </span>
                <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setPasswordSetupUser(null)}>
                  ✕ Kapat
                </button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span className="brand-mark" style={{ display: 'inline-block', marginBottom: 8, fontSize: '1.4rem' }}>🔑</span>
                <h3 style={{ margin: '0 0 4px', color: '#111827' }}>Hoş Geldiniz, {passwordSetupUser.name}!</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280' }}>
                  SaaS Süper Admin hesabınız için lütfen kendi şifrenizi belirleyin.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (passwordForm.password.length < 6) {
                    alert('Şifre en az 6 karakter olmalıdır.');
                    return;
                  }
                  if (passwordForm.password !== passwordForm.confirmPassword) {
                    alert('Girilen şifreler eşleşmiyor.');
                    return;
                  }
                  alert(`🎉 TEBRİKLER!\n\n"${passwordSetupUser.name}" Süper Admin hesabınız için şifreniz başarıyla kaydedildi ve SaaS Yönetimi paneline İLK GİRİŞİNİZ simüle edildi!`);
                  setPasswordSetupUser(null);
                }}
                style={{ display: 'grid', gap: 16 }}
              >
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <strong>Süper Admin E-postası:</strong> {passwordSetupUser.email}<br />
                  <strong>Yetki Seviyesi:</strong> {passwordSetupUser.role}
                </div>

                <label className="select-field">
                  <span>Yeni Şifreniz *</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="En az 6 karakterli güçlü şifre"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                      style={{ paddingRight: 42, width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        padding: 4
                      }}
                      title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>

                <label className="select-field">
                  <span>Yeni Şifre (Tekrar) *</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Şifrenizi tekrar girin"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      style={{ paddingRight: 42, width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        padding: 4
                      }}
                      title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  style={{
                    padding: '14px',
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    marginTop: 6
                  }}
                >
                  ✅ Şifremi Kaydet & SaaS Paneline Giriş Yap
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Invite Link & Email Status Dialog Modal */}
      {activeInviteDialogInfo &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'grid',
              placeItems: 'center',
              padding: 20
            }}
            onClick={() => setActiveInviteDialogInfo(null)}
          >
            <div
              style={{
                maxWidth: 620,
                width: '100%',
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: 18,
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>✉️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Davet & Şifre Belirleme Bağlantısı</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{activeInviteDialogInfo.companyName} ({activeInviteDialogInfo.email})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInviteDialogInfo(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                  E-posta daveti <strong>{activeInviteDialogInfo.email}</strong> adresi için oluşturuldu.
                </p>
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#475569', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }}>
                  💡 <strong>Not (Resend Test Modu):</strong> Resend e-posta servisinizde custom alan adı (<code>codentra.com.tr</code>) doğrulanana kadar test modundaki API anahtarı harici e-posta adreslerine (ör. gmail) gönderimi engelleyebilir.
                  <br />
                  Aşağıdaki <strong>'Şifre Belirleme Ekranını Doğrudan Aç'</strong> butonuna tıklayarak yeni şifrenizi hemen belirleyebilirsiniz.
                </div>
              </div>


              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                  Doğrudan Aktivasyon & Şifre Belirleme Bağlantısı:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={activeInviteDialogInfo.inviteLink}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '0.82rem',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#f1f5f9',
                      color: '#0f172a',
                      fontWeight: 600
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      padding: '10px 16px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => {
                      navigator.clipboard?.writeText(activeInviteDialogInfo.inviteLink);
                      alert('📋 Davet bağlantısı panoya kopyalandı!');
                    }}
                  >
                    📋 Kopyala
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  style={{
                    padding: '10px 16px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveInviteDialogInfo(null)}
                >
                  Kapat
                </button>
                <a
                  href={activeInviteDialogInfo.inviteLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 18px',
                    background: '#10b981',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  🚀 Şifre Belirleme Ekranını Doğrudan Aç →
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

