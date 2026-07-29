import type { SaaSContract, SaaSEmailTemplate, SaaSInvoice, SaaSOffer, SaaSPackageDefinition, SaaSTenant } from '../types';

export const initialSaaSPackages: SaaSPackageDefinition[] = [
  {
    id: 'pkg-starter',
    name: 'Starter (Başlangıç)',
    monthlyFee: 6500,
    annualFee: 65000,
    maxUsers: 5,
    description: 'Küçük ölçekli OSGB ve danışmanlık firmaları için temel CRM ve teklif modülleri.',
    isPopular: false,
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: false,
      analytics: false
    }
  },
  {
    id: 'pkg-pro',
    name: 'Pro (Profesyonel)',
    monthlyFee: 14500,
    annualFee: 145000,
    maxUsers: 15,
    description: 'Orta ve büyümekte olan OSGB firmaları için doküman kütüphanesi ve onay süreçleri dahil paket.',
    isPopular: true,
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: true,
      analytics: true
    }
  },
  {
    id: 'pkg-enterprise',
    name: 'Enterprise (Kurumsal)',
    monthlyFee: 28000,
    annualFee: 280000,
    maxUsers: 50,
    description: 'Büyük ölçekli grup OSGB ve çok şubeli danışmanlık şirketleri için sınırsız modüller ve gelişmiş analitik.',
    isPopular: false,
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: true,
      analytics: true
    }
  }
];

export const initialSaaSTenants: SaaSTenant[] = [
  {
    id: '3b3e7f5a-9d2c-4e8a-b1c4-9a8b7c6d5e4f',
    tenantCode: 'TNT-OSGB3',
    companyName: 'Test OSGB 3',
    contactName: 'Orhan Vardar',
    email: 'orhan.vardar@gmail.com',
    phone: '0850 000 00 00',
    city: 'İstanbul',
    package: 'Enterprise',
    status: 'Aktif',
    paymentStatus: 'Sorunsuz',
    healthStatus: 'Mükemmel',
    billingCycle: 'Yıllık',
    monthlyFee: 28000,
    annualFee: 336000,
    maxUsers: 50,
    activeUsers: 1,
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    autoRenew: true,
    notes: 'Codentra canlı doğrulama kiracısı',
    modulesEnabled: { crm: true, offers: true, contracts: true, documents: true, analytics: true },
    lastLoginAt: 'Bugün',
    createdBy: 'orhan.vardar@gmail.com',
    createdAt: '2026-01-01 10:00',
    updatedBy: 'orhan.vardar@gmail.com',
    updatedAt: '2026-01-01 10:00',
    activationStatus: 'Hesap Aktif (Şifre Belirlendi)',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%231e293b"/></linearGradient><linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><rect width="200" height="200" rx="40" fill="url(%23bgGrad)"/><circle cx="100" cy="85" r="45" fill="none" stroke="url(%23iconGrad)" stroke-width="8"/><path d="M100 55 v60 M70 85 h60" stroke="%23ffffff" stroke-width="10" stroke-linecap="round"/><text x="100" y="160" font-family="sans-serif" font-weight="900" font-size="18" fill="%23ffffff" text-anchor="middle" letter-spacing="1">TEST OSGB 3</text></svg>'
  }
];

export const initialSaaSOffers: SaaSOffer[] = [];

export const initialSaaSContracts: SaaSContract[] = [];

export const initialSaaSInvoices: SaaSInvoice[] = [];

export const initialSaaSEmailTemplates: SaaSEmailTemplate[] = [
  {
    id: 'tmpl-1',
    type: 'invitation',
    title: 'Müşteri Davet & Aktivasyon',
    subject: '{FIRMA_ADI} — Codentra Teklif ve Sözleşme Yönetimi Erişimi Aktivasyonu',
    body: `Sayın {YETKILI_ADI},

{FIRMA_ADI} bünyesinde kullanabileceğiniz Codentra Teklif ve Sözleşme Yönetimi bulut sisteminiz aktif edilmiştir.

Aşağıdaki bağlantıya tıklayarak şifrenizi belirleyebilir ve hemen kullanmaya başlayabilirsiniz:
{AKTIVASYON_LINKI}

İyi çalışmalar dileriz,
Codentra SaaS Ekibi`
  }
];
