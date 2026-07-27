import { useEffect, useMemo, useState } from 'react';

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
import { fetchCloudTenants, saveCloudTenants } from '../../lib/cloudDb';


type Props = {
  onImpersonateTenant?: (tenant: SaaSTenant) => void;
  onNavigateSection?: (section: SectionId) => void;
  currentUserEmail?: string;
};

export function SaaSAdminPage({ onImpersonateTenant, onNavigateSection, currentUserEmail }: Props) {
  const activeUserEmail = currentUserEmail || localStorage.getItem('crm_user_session') || 'orhan.vardar@gmail.com';
  const [sendingEmail, setSendingEmail] = useState(false);
  const [tenants, setTenants] = useState<SaaSTenant[]>(() => {
    try {
      const saved = localStorage.getItem('crm_saas_tenants_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialSaaSTenants;
  });

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

  useEffect(() => {
    saveCloudTenants(tenants);
  }, [tenants]);

  useEffect(() => {
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
    const fetchCloudTenants = async () => {
      try {
        const { data, error } = await supabase.from('tenants').select('*');
        if (data && data.length > 0 && !error) {
          const isDummyTenant = (name: string) => {
            if (!name) return false;
            const clean = name.toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').trim();
            if (clean.includes('test osgb 3')) return false;
            const keywords = ['girisim', 'mavi liman', 'soyyilmaz', 'oddn'];
            if (clean === 'test osgb') return true;
            return keywords.some(kw => clean.includes(kw));
          };
          setTenants((prev) => {
            const dbTenants: SaaSTenant[] = data
              .filter((row: any) => row.name && !isDummyTenant(row.name))
              .map((row: any) => ({
              id: row.id,
              tenantCode: `TNT-${row.id.substring(0, 4).toUpperCase()}`,
              companyName: row.name,
              contactName: 'Sistem Yetkilisi',
              email: `${row.slug || 'info'}@codentra.com.tr`,
              phone: '0850 000 00 00',
              city: 'İstanbul',
              package: 'Enterprise' as SaaSPackage,
              status: row.is_active ? ('Aktif' as SaaSSubscriptionStatus) : ('Pasif' as any),
              paymentStatus: 'Sorunsuz' as SaaSPaymentStatus,
              healthStatus: 'Mükemmel' as SaaSHealthStatus,
              billingCycle: 'Aylık',
              monthlyFee: 28000,
              annualFee: 336000,
              maxUsers: 50,
              activeUsers: 1,
              startDate: row.created_at ? row.created_at.split('T')[0] : '2026-01-01',
              endDate: '2027-01-01',
              autoRenew: true,
              notes: 'Supabase Bulut Veritabanından Canlı Senkronize Edildi',
              modulesEnabled: { crm: true, offers: true, contracts: true, documents: true, analytics: true },
              lastLoginAt: 'Bugün',
              createdBy: 'orhan.vardar@gmail.com',
              createdAt: row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR'),
              updatedBy: 'orhan.vardar@gmail.com',
              updatedAt: new Date().toLocaleString('tr-TR'),
              activationStatus: 'Hesap Aktif (Şifre Belirlendi)'
            }));

            const cleanPrev = prev.filter((p) => !isDummyTenant(p.companyName));
            const existingIds = new Set(dbTenants.map((t) => t.id));
            const merged = [...dbTenants, ...cleanPrev.filter((p) => !existingIds.has(p.id))];
            return merged.length > 0 ? merged : initialSaaSTenants;
          });
        }
      } catch (e) {
        console.error('Supabase tenants fetch error:', e);
      }
    };

    fetchCloudTenants();

    const channel = supabase
      .channel('realtime-saas-tenants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        fetchCloudTenants();
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

  // UI Modals & Drawers
  const [selectedTenant, setSelectedTenant] = useState<SaaSTenant | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'license' | 'billing' | 'modules' | 'notes'>('info');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

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

  // Calculate KPIs
  const metrics = useMemo(() => {
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'Aktif').length;
    const demoTenants = tenants.filter((t) => t.status === 'Demo').length;

    const mrr = tenants
      .filter((t) => t.status === 'Aktif' || t.status === 'Demo')
      .reduce((sum, t) => sum + (t.monthlyFee || 0), 0);

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

  // Filter Tenants
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
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
  }, [tenants, searchQuery, statusFilter, packageFilter, paymentFilter, upsellOnlyFilter]);

  // Filter Invoices by Period
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invoiceMonthFilter === 'all') return true;
      return inv.billingPeriod.toLowerCase().includes(invoiceMonthFilter.toLowerCase());
    });
  }, [invoices, invoiceMonthFilter]);

  // Generate Monthly Invoices Batch (Aylık Faturaları Toplu Kesme)
  const handleGenerateMonthlyInvoices = () => {
    const currentMonthName = 'Ağustos 2026';
    const monthlyTenants = tenants.filter((t) => t.status === 'Aktif' && t.billingCycle === 'Aylık');

    if (monthlyTenants.length === 0) {
      alert('Aylık ödemeli aktif kiracı bulunamadı.');
      return;
    }

    const newMonthlyInvoices: SaaSInvoice[] = monthlyTenants.map((t) => ({
      id: `inv-rec-${t.id}-${Date.now()}`,
      invoiceNumber: `SAAS-INV-2026-${Math.floor(100 + Math.random() * 900)}`,
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

  // Handle Send Offer Email to Client
  const handleSendOfferEmail = (offer: SaaSOffer) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id && o.status === 'Taslak' ? { ...o, status: 'Gönderildi' } : o))
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
    const htmlContent = buildCustomerInviteTemplate(companyName, inviteLink);

    const res = await sendEmail({
      to: email,
      subject: subject,
      html: htmlContent
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

    if (res.success) {
      alert(`✉️ DAVET E-POSTASI BAŞARIYLA GÖNDERİLDİ!\n\nAlıcı: ${email}\nFirma: ${companyName}\nKonu: ${subject}\n\nLütfen e-posta kutunuzu (Gelen Kutusu & Spam/Junk klasörü) kontrol ediniz.`);
    } else {
      alert(`✉️ E-posta gönderildi/oluşturuldu. Davet Bağlantısı:\n${inviteLink}`);
    }
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

    setTenants((prev) =>
      prev.map((t) =>
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
      )
    );

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
      id: `tenant-${Date.now()}`,
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
      activationStatus: 'Davet Gönderilmedi'

    };

    setTenants((prev) => [newTenant, ...prev]);

    // Sync newly created tenant immediately to Supabase PostgreSQL Cloud Database!
    supabase.from('tenants').insert([{
      name: newTenant.companyName,
      slug: newTenant.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      is_active: true
    }]).then((res) => {
      console.log('Supabase tenant creation sync:', res);
    });

    setIsAddModalOpen(false);
    setSelectedTenant(newTenant);
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

        {/* Main Section Navigation Tabs */}
        <div className="filter-group" style={{ justifyContent: 'flex-start', marginBottom: 18, flexWrap: 'wrap' }}>
          <button
            className={`filter-chip ${mainTab === 'tenants' ? 'filter-chip-active' : ''}`}
            onClick={() => setMainTab('tenants')}
          >
            🏢 Kiracı Müşteriler ({tenants.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'offers-contracts' ? 'filter-chip-active' : ''}`}
            onClick={() => setMainTab('offers-contracts')}
          >
            📄 Teklifler ({offers.length}) & Sözleşmeler ({contracts.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'invoices' ? 'filter-chip-active' : ''}`}
            onClick={() => setMainTab('invoices')}
          >
            💳 Tahsilat & Fatura Logları ({invoices.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'email-templates' ? 'filter-chip-active' : ''}`}
            onClick={() => setMainTab('email-templates')}
          >
            📧 E-posta Şablonları ({emailTemplates.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'packages' ? 'filter-chip-active' : ''}`}
            onClick={() => setMainTab('packages')}
          >
            📦 Abonelik Paketleri ({packages.length})
          </button>

          <button
            className={`filter-chip ${mainTab === 'super-admins' ? 'filter-chip-active' : ''}`}
            style={{ background: mainTab === 'super-admins' ? '#6366f1' : undefined, color: mainTab === 'super-admins' ? '#ffffff' : undefined }}
            onClick={() => setMainTab('super-admins')}
          >
            🛡️ Süper Admin Kadrosu ({superAdmins.length})
          </button>
        </div>

        {/* Metrics Row */}
        <section className="metrics-grid metrics-grid-compact" style={{ marginTop: 0 }}>
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

          <article className="panel metric-card metric-card-minimal" style={{ borderLeft: '4px solid #f59e0b' }}>
            <p className="eyebrow">⚠️ Upsell / Limit Uyarısı</p>
            <strong style={{ color: metrics.upsellCount > 0 ? '#d97706' : 'var(--good)' }}>
              {metrics.upsellCount} Firma
            </strong>
            <span>%80+ Kapasite kullanımında</span>
          </article>

          <article className="panel metric-card metric-card-minimal">
            <p className="eyebrow">Tahsilat Faturası</p>
            <strong>{invoices.length} Fatura</strong>
            <span>{invoices.filter((i) => i.status === 'Gecikmede').length} Geciken Ödeme</span>
          </article>
        </section>
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
          <div className="customer-filter-grid" style={{ marginBottom: 18 }}>
            <label className="search-field customer-search-field">
              <span>Arama</span>
              <input
                type="text"
                placeholder="Firma adı, kod, şehir veya yetkili ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>

            <label className="select-field">
              <span>Abonelik Durumu</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tüm Durumlar</option>
                <option value="Aktif">Aktif</option>
                <option value="Demo">Demo / Deneme</option>
                <option value="Aday">Aday Müşteri</option>
                <option value="Askıda">Askıda / Dondurulmuş</option>
                <option value="İptal">İptal Edilmiş</option>
              </select>
            </label>

            <label className="select-field">
              <span>Paket Tipi</span>
              <select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)}>
                <option value="all">Tüm Paketler</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.name.split(' ')[0]}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <span>Limit & Upsell Durumu</span>
              <select
                value={upsellOnlyFilter ? 'upsell' : 'all'}
                onChange={(e) => setUpsellOnlyFilter(e.target.value === 'upsell')}
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
                  <th>Kiracı Firma & Yetkili</th>
                  <th>Paket & Kullanıcı Kullanımı</th>
                  <th>Lisans Ücreti</th>
                  <th>Şifre & Giriş Durumu</th>
                  <th>Ödeme & Sağlık</th>
                  <th>Durum</th>
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
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                display: 'inline-block',
                                background:
                                  tenant.healthStatus === 'Mükemmel' || tenant.healthStatus === 'İyi'
                                    ? '#10b981'
                                    : tenant.healthStatus === 'Riskli'
                                    ? '#f59e0b'
                                    : '#ef4444'
                              }}
                              title={`Sağlık Durumu: ${tenant.healthStatus}`}
                            />
                            <div>
                              <strong style={{ fontSize: '0.95rem' }}>{tenant.companyName}</strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {tenant.tenantCode} • {tenant.city} • {tenant.contactName}
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
                          <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                            <button
                              className="btn-action-ghost"
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setDetailTab('info');
                              }}
                            >
                              👁️ Detay
                            </button>

                            <button
                              className="btn-action-primary"
                              onClick={() => {
                                if (onImpersonateTenant) onImpersonateTenant(tenant);
                                else if (onNavigateSection) onNavigateSection('customers');
                              }}
                            >
                              🚀 Kiracı CRM'ine Geç →
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
                    <th>Teklif No</th>
                    <th>Kiracı / Aday Firma</th>
                    <th>Paket & Periyot</th>
                    <th>Teklif Tutarı</th>
                    <th>Tarih / Geçerlilik</th>
                    <th>Durum</th>
                    <th style={{ textAlign: 'right' }}>Teklif İşlemleri & Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((off) => (
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

                          {off.status !== 'Kabul Edildi' && (
                            <button
                              className="btn-action-good"
                              onClick={() => handleConvertOfferToContract(off)}
                              title="Doğrudan sözleşmeye dönüştür"
                            >
                              ✍️ Sözleşmeye Dönüştür
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            </div>

            <div className="customer-table-wrap">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>Sözleşme No</th>
                    <th>Kiracı Firma</th>
                    <th>Paket</th>
                    <th>Yıllık Lisans Tutarı</th>
                    <th>Sözleşme Dönemi</th>
                    <th>İmzalayan / Tarih</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((cnt) => (
                    <tr key={cnt.id}>
                      <td><strong>{cnt.contractNumber}</strong></td>
                      <td>{cnt.tenantName}</td>
                      <td><span className="mini-badge">{cnt.packageName}</span></td>
                      <td><strong>₺{cnt.annualFee.toLocaleString('tr-TR')}</strong> / yıl</td>
                      <td>{cnt.startDate} - {cnt.endDate}</td>
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
                    </tr>
                  ))}
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
                  <th>Fatura No</th>
                  <th>Kiracı Firma</th>
                  <th>Abonelik Periyodu / Ay</th>
                  <th>Fatura Tutarı</th>
                  <th>Kesim & Vade Tarihi</th>
                  <th>Tahsilat Durumu</th>
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
                          onClick={() => alert(`📄 ${inv.invoiceNumber} PDF Faturası indiriliyor...`)}
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
                  <h4 style={{ margin: '4px 0 2px', color: '#111827' }}>Codentra Software & Yazılım A.Ş.</h4>
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
          onClick={() => setEditingLicenseTenant(null)}
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

                {licenseEditForm.billingCycle === 'Yıllık' ? (
                  <label className="select-field">
                    <span>Pazarlık Edilen Yıllık Ücret (₺)</span>
                    <input
                      type="number"
                      value={licenseEditForm.annualFee}
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
                ) : (
                  <label className="select-field">
                    <span>Pazarlık Edilen Aylık Ücret (₺)</span>
                    <input
                      type="number"
                      value={licenseEditForm.monthlyFee}
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
                )}

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
      {selectedTenant && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
          onClick={() => setSelectedTenant(null)}
        >
          <div
            className="panel panel-wide panel-elevated"
            style={{ maxWidth: 740, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">{selectedTenant.tenantCode} • Kiracı Detayı</p>
                <h3>{selectedTenant.companyName}</h3>
              </div>
              <button
                className="mini-badge"
                style={{ cursor: 'pointer', background: 'transparent' }}
                onClick={() => setSelectedTenant(null)}
              >
                ✕ Kapat
              </button>
            </div>

            {/* Detail Tabs */}
            <div className="filter-group" style={{ justifyContent: 'flex-start', marginBottom: 20 }}>
              <button
                className={`filter-chip ${detailTab === 'info' ? 'filter-chip-active' : ''}`}
                onClick={() => setDetailTab('info')}
              >
                Firma Bilgileri
              </button>
              <button
                className={`filter-chip ${detailTab === 'license' ? 'filter-chip-active' : ''}`}
                onClick={() => setDetailTab('license')}
              >
                Lisans & Paket
              </button>
              <button
                className={`filter-chip ${detailTab === 'billing' ? 'filter-chip-active' : ''}`}
                onClick={() => setDetailTab('billing')}
              >
                Sözleşme, Fatura & Teklifler
              </button>
              <button
                className={`filter-chip ${detailTab === 'modules' ? 'filter-chip-active' : ''}`}
                onClick={() => setDetailTab('modules')}
              >
                Modül Yetkileri
              </button>
              <button
                className={`filter-chip ${detailTab === 'notes' ? 'filter-chip-active' : ''}`}
                onClick={() => setDetailTab('notes')}
              >
                Notlar
              </button>
            </div>

            {/* Tab Contents */}
            {detailTab === 'info' && (
              <div className="customer-firm-layout" style={{ display: 'grid', gap: 16 }}>
                <dl className="customer-info-grid">
                  <div>
                    <dt>Yetkili Ad Soyad</dt>
                    <dd>{selectedTenant.contactName}</dd>
                  </div>
                  <div>
                    <dt>E-posta</dt>
                    <dd>{selectedTenant.email}</dd>
                  </div>
                  <div>
                    <dt>Telefon</dt>
                    <dd>{selectedTenant.phone}</dd>
                  </div>
                  <div>
                    <dt>Şehir</dt>
                    <dd>{selectedTenant.city}</dd>
                  </div>
                  <div>
                    <dt>Kaydı Oluşturan</dt>
                    <dd>{selectedTenant.createdBy || activeUserEmail}</dd>
                  </div>
                  <div>
                    <dt>Oluşturulma Tarihi</dt>
                    <dd>{selectedTenant.createdAt || selectedTenant.startDate}</dd>
                  </div>
                  <div>
                    <dt>Son Güncelleyen</dt>
                    <dd>{selectedTenant.updatedBy || activeUserEmail}</dd>
                  </div>

                  <div>
                    <dt>Son İşlem Zamanı</dt>
                    <dd>{selectedTenant.updatedAt || selectedTenant.lastLoginAt}</dd>
                  </div>
                </dl>

                <div className="module-card module-card-flat" style={{ minHeight: 'auto', padding: 18 }}>
                  <p className="eyebrow">Aktivasyon & Davet Takibi</p>
                  <h4 style={{ margin: '4px 0 8px' }}>
                    Durum: {selectedTenant.activationStatus || 'Davet Gönderilmedi'}
                  </h4>

                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button
                      className="primary-action"
                      style={{ fontSize: '0.85rem' }}
                      onClick={() =>
                        handleSendInvitation(selectedTenant.id, selectedTenant.email, selectedTenant.companyName)
                      }
                    >
                      ✉️ Davet & Şifre Bağlantısı Gönder
                    </button>
                    <button
                      className="secondary-action"
                      style={{ fontSize: '0.85rem' }}
                      onClick={() => handleCopyInviteLink(selectedTenant.id)}
                    >
                      📋 Magic Link Kopyala
                    </button>
                  </div>
                </div>

                <div className="module-card module-card-flat" style={{ minHeight: 'auto', padding: 18 }}>
                  <p className="eyebrow">Hızlı Giriş Bağlantısı</p>
                  <h4 style={{ margin: '4px 0 8px' }}>{selectedTenant.companyName} CRM Modu</h4>
                  <p className="form-hint" style={{ marginTop: 0, marginBottom: 14 }}>
                    Bu kiracının kendi müşterilerini yönettiği Offer & Contract alanına geçiş yapmak için aşağıdaki butonu kullanın.
                  </p>
                  <button
                    className="primary-action"
                    style={{ width: '100%' }}
                    onClick={() => {
                      if (onImpersonateTenant) onImpersonateTenant(selectedTenant);
                      else if (onNavigateSection) onNavigateSection('customers');
                    }}
                  >
                    🚀 {selectedTenant.companyName} CRM Ekranına Geç
                  </button>
                </div>
              </div>
            )}

            {detailTab === 'license' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <dl className="customer-info-grid">
                  <div>
                    <dt>Aktif Paket</dt>
                    <dd>
                      <strong>{selectedTenant.package ? `${selectedTenant.package} Paketi` : 'Paket Seçilmedi'}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Faturalama Periyodu</dt>
                    <dd>{selectedTenant.billingCycle || 'Belirtilmedi'}</dd>
                  </div>
                  <div>
                    <dt>Lisans Ücreti</dt>
                    <dd>
                      {selectedTenant.monthlyFee > 0
                        ? selectedTenant.billingCycle === 'Yıllık' && selectedTenant.annualFee
                          ? `₺${selectedTenant.annualFee.toLocaleString('tr-TR')} / yıl (₺${selectedTenant.monthlyFee.toLocaleString('tr-TR')}/ay)`
                          : `₺${selectedTenant.monthlyFee.toLocaleString('tr-TR')} / ay`
                        : 'Belirtilmedi (Aday Müşteri)'}
                    </dd>
                  </div>
                  <div>
                    <dt>Kullanıcı Limiti & Kullanım</dt>
                    <dd>
                      {selectedTenant.maxUsers > 0
                        ? `${selectedTenant.activeUsers} aktif / ${selectedTenant.maxUsers} max kullanıcı (%${Math.round((selectedTenant.activeUsers / selectedTenant.maxUsers) * 100)})`
                        : 'Sınır Tanımlanmadı (Aday)'}
                    </dd>
                  </div>
                  <div>
                    <dt>Otomatik Yenileme</dt>
                    <dd>{selectedTenant.autoRenew ? 'Evet (Aktif)' : 'Hayır'}</dd>
                  </div>
                </dl>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <button
                    className="primary-action"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setEditingLicenseTenant(selectedTenant);
                      setLicenseEditForm({
                        package: selectedTenant.package || 'Pro',
                        status: selectedTenant.status,
                        billingCycle: selectedTenant.billingCycle || 'Yıllık',
                        monthlyFee: selectedTenant.monthlyFee || 14500,
                        annualFee: selectedTenant.annualFee || 145000,
                        maxUsers: selectedTenant.maxUsers || 15,
                        notes: selectedTenant.notes || ''
                      });
                    }}
                  >
                    ✏️ Anlaşma & Paket Bilgilerini Düzenle (Pazarlık Güncelle)
                  </button>
                </div>
              </div>
            )}

            {detailTab === 'billing' && (
              <div style={{ display: 'grid', gap: 18 }}>
                <div className="section-heading" style={{ marginBottom: 8 }}>
                  <div>
                    <p className="eyebrow">Teklif, Sözleşme & Tahsilatlar</p>
                    <h4 style={{ margin: 0 }}>Bu Kiracı İçin SaaS Finansal Geçmiş</h4>
                  </div>
                  <button
                    className="primary-action"
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => {
                      setOfferForm({
                        tenantId: selectedTenant.id,
                        packageName: selectedTenant.package || 'Pro',
                        billingCycle: selectedTenant.billingCycle === 'Yıllık' ? 'Yıllık' : 'Aylık',
                        monthlyFee: selectedTenant.monthlyFee || 14500,
                        annualFee: selectedTenant.annualFee || 145000,
                        validDays: 14,
                        notes: ''
                      });
                      setIsOfferModalOpen(true);
                    }}
                  >
                    📄 Bu Kiracıya Özel SaaS Teklifi Hazırla
                  </button>
                </div>

                <div className="module-card module-card-flat" style={{ minHeight: 'auto', padding: 16 }}>
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>
                    SaaS Lisans Faturaları & Tahsilat Logları
                  </span>
                  {invoices.filter((i) => i.tenantId === selectedTenant.id).length > 0 ? (
                    <div className="customer-table-wrap">
                      <table className="customer-table" style={{ fontSize: '0.84rem' }}>
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
                          {invoices
                            .filter((i) => i.tenantId === selectedTenant.id)
                            .map((inv) => (
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
                    <p className="form-hint" style={{ margin: 0 }}>Henüz bu kiracı için fatura kaydı oluşmadı.</p>
                  )}
                </div>
              </div>
            )}

            {detailTab === 'modules' && (
              <div className="theme-picker-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div className="module-card module-card-flat" style={{ minHeight: 'auto', padding: 14 }}>
                  <strong>Müşteri CRM Modülü</strong>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {selectedTenant.modulesEnabled.crm ? '✓ Aktif' : '✗ Pasif'}
                  </p>
                </div>
                <div className="module-card module-card-flat" style={{ minHeight: 'auto', padding: 14 }}>
                  <strong>Teklif Oluşturma & Revizyon</strong>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {selectedTenant.modulesEnabled.offers ? '✓ Aktif' : '✗ Pasif'}
                  </p>
                </div>
                <div className="module-card module-card-flat" style={{ minHeight: 'auto', padding: 14 }}>
                  <strong>Hizmet Sözleşmeleri Modülü</strong>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {selectedTenant.modulesEnabled.contracts ? '✓ Aktif' : '✗ Pasif'}
                  </p>
                </div>
                <div className="module-card module-card-flat" style={{ minHeight: 'auto', padding: 14 }}>
                  <strong>Doküman Kütüphanesi</strong>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>
                    {selectedTenant.modulesEnabled.documents ? '✓ Aktif' : '✗ Pasif'}
                  </p>
                </div>
              </div>
            )}

            {detailTab === 'notes' && (
              <label className="select-field">
                <span>Yazılım Firması Özel İç Notları</span>
                <textarea
                  rows={5}
                  value={selectedTenant.notes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTenant((prev) => (prev ? { ...prev, notes: val } : null));
                    setTenants((prev) => prev.map((t) => (t.id === selectedTenant.id ? { ...t, notes: val } : t)));
                  }}
                  placeholder="Müşteri ilişkileri, özel talepler veya ödeme detayları..."
                />
              </label>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="secondary-action" onClick={() => setSelectedTenant(null)}>
                Kapat
              </button>
              <button
                className="primary-action"
                onClick={() => {
                  if (onImpersonateTenant) onImpersonateTenant(selectedTenant);
                  else if (onNavigateSection) onNavigateSection('customers');
                }}
              >
                Kiracı CRM'ine Geç →
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
            zIndex: 100,
            background: 'rgba(17, 24, 39, 0.45)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            padding: 20
          }}
          onClick={() => setIsAddModalOpen(false)}
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

                {newForm.billingCycle === 'Yıllık' ? (
                  <label className="select-field">
                    <span>Yıllık Lisans Ücreti (₺)</span>
                    <input
                      type="number"
                      placeholder="Boş bırakılabilir"
                      value={newForm.annualFee}
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
                ) : (
                  <label className="select-field">
                    <span>Aylık Ücret (₺)</span>
                    <input
                      type="number"
                      placeholder="Boş bırakılabilir"
                      value={newForm.monthlyFee}
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
                )}

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

      {/* SaaS Offer Modal */}
      {isOfferModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
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
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, billingCycle: e.target.value as 'Aylık' | 'Yıllık' })
                    }
                  >
                    <option value="Yıllık">Yıllık (İndirimli)</option>
                    <option value="Aylık">Aylık</option>
                  </select>
                </label>

                {offerForm.billingCycle === 'Yıllık' ? (
                  <label className="select-field">
                    <span>Teklif Edilen Yıllık Ücret (₺)</span>
                    <input
                      type="number"
                      value={offerForm.annualFee}
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
                ) : (
                  <label className="select-field">
                    <span>Teklif Edilen Aylık Ücret (₺)</span>
                    <input
                      type="number"
                      value={offerForm.monthlyFee}
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
                )}

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
    </div>
  );
}
