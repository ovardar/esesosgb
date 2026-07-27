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

export const initialSaaSTenants: SaaSTenant[] = [];

export const initialSaaSOffers: SaaSOffer[] = [];

export const initialSaaSContracts: SaaSContract[] = [];

export const initialSaaSInvoices: SaaSInvoice[] = [];

export const initialSaaSEmailTemplates: SaaSEmailTemplate[] = [
  {
    id: 'tmpl-1',
    type: 'invitation',
    title: 'Müşteri Davet & Aktivasyon',
    subject: '{FIRMA_ADI} — Codentra SaaS CRM Erişimi Aktivasyonu',
    body: `Sayın {YETKILI_ADI},

{FIRMA_ADI} bünyesinde kullanabileceğiniz Codentra OSGB & İSG CRM bulut sisteminiz aktif edilmiştir.

Aşağıdaki bağlantıya tıklayarak şifrenizi belirleyebilir ve hemen kullanmaya başlayabilirsiniz:
{AKTIVASYON_LINKI}

İyi çalışmalar dileriz,
Codentra SaaS Ekibi`
  }
];
