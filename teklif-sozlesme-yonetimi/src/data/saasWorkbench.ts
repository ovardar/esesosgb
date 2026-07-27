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
    id: 'tenant-1',
    tenantCode: 'TNT-1001',
    companyName: 'Metropol OSGB & Sağlık Hizmetleri A.Ş.',
    contactName: 'Ahmet Yılmaz (Genel Müdür)',
    email: 'ahmet@metropolosgb.com.tr',
    phone: '0212 555 10 20',
    city: 'İstanbul',
    package: 'Pro',
    status: 'Aktif',
    paymentStatus: 'Sorunsuz',
    healthStatus: 'Mükemmel',
    monthlyFee: 14500,
    maxUsers: 15,
    activeUsers: 12,
    startDate: '2025-01-15',
    endDate: '2026-01-15',
    autoRenew: true,
    notes: 'Kullanım oranı çok yüksek. Ekstra muhasebe entegrasyonu talep ettiler.',
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: true,
      analytics: true
    },
    lastLoginAt: '2026-07-23 14:20'
  },
  {
    id: 'tenant-2',
    tenantCode: 'TNT-1002',
    companyName: 'Vip İş Sağlığı ve Güvenliği Ltd. Şti.',
    contactName: 'Selin Aksoy (CRM Yöneticisi)',
    email: 'selin@vipisg.com',
    phone: '0216 444 88 99',
    city: 'İstanbul',
    package: 'Enterprise',
    status: 'Aktif',
    paymentStatus: 'Gecikmede',
    healthStatus: 'İyi',
    monthlyFee: 28000,
    maxUsers: 50,
    activeUsers: 38,
    startDate: '2024-11-01',
    endDate: '2026-11-01',
    autoRenew: true,
    notes: 'Haziran ayı faturası 12 gün gecikmede. Muhasebeye hatırlatma yapıldı.',
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: true,
      analytics: true
    },
    lastLoginAt: '2026-07-23 11:05'
  },
  {
    id: 'tenant-3',
    tenantCode: 'TNT-1003',
    companyName: 'Ege Risk Danışmanlık ve İSG San. Tic.',
    contactName: 'Mustafa Kaya (Kurucu)',
    email: 'mustafa@egerisk.com',
    phone: '0232 321 00 11',
    city: 'İzmir',
    package: 'Starter',
    status: 'Demo',
    paymentStatus: 'Bekliyor',
    healthStatus: 'Riskli',
    monthlyFee: 6500,
    maxUsers: 5,
    activeUsers: 2,
    startDate: '2026-07-10',
    endDate: '2026-07-24',
    autoRenew: false,
    notes: '14 günlük deneme süresinin bitmesine 1 gün kaldı. Satış temsilcisi sunum yapacak.',
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: false,
      analytics: false
    },
    lastLoginAt: '2026-07-20 09:40'
  },
  {
    id: 'tenant-4',
    tenantCode: 'TNT-1004',
    companyName: 'Doğu Marmara Ortak Sağlık Güvenlik Birimi',
    contactName: 'Erkan Demir (Operasyon Müdürü)',
    email: 'erkan@dogumarmaraosgb.com',
    phone: '0262 688 12 34',
    city: 'Kocaeli',
    package: 'Pro',
    status: 'Aktif',
    paymentStatus: 'Sorunsuz',
    healthStatus: 'Mükemmel',
    monthlyFee: 14500,
    maxUsers: 15,
    activeUsers: 14,
    startDate: '2025-08-01',
    endDate: '2026-08-01',
    autoRenew: true,
    notes: 'Sözleşme yenileme zamanı yaklaştı (7 gün kaldı). Yıllık %25 artışlı yenileme teklifi gönderildi.',
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: true,
      analytics: true
    },
    lastLoginAt: '2026-07-23 13:50'
  },
  {
    id: 'tenant-5',
    tenantCode: 'TNT-1005',
    companyName: 'TeknoSağlık Danışmanlık A.Ş.',
    contactName: 'Ceren Aydın (İK Müdürü)',
    email: 'ceren@teknosaglik.com.tr',
    phone: '0312 210 99 88',
    city: 'Ankara',
    package: 'Starter',
    status: 'Askıda',
    paymentStatus: 'Gecikmede',
    healthStatus: 'Kritik',
    monthlyFee: 6500,
    maxUsers: 5,
    activeUsers: 0,
    startDate: '2025-03-01',
    endDate: '2026-03-01',
    autoRenew: false,
    notes: '2 aydır ödeme yapılmadığı için hesap donduruldu. Görüşmeler devam ediyor.',
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: false,
      documents: false,
      analytics: false
    },
    lastLoginAt: '2026-05-14 16:30'
  },
  {
    id: 'tenant-6',
    tenantCode: 'TNT-1006',
    companyName: 'Anadolu Bölge İSG Çözümleri A.Ş.',
    contactName: 'Gökhan Şahin',
    email: 'gokhan@anadoluisg.com',
    phone: '0322 456 78 90',
    city: 'Adana',
    package: 'Pro',
    status: 'Aday',
    paymentStatus: 'Bekliyor',
    healthStatus: 'İyi',
    monthlyFee: 14500,
    maxUsers: 15,
    activeUsers: 0,
    startDate: '2026-08-01',
    endDate: '2027-08-01',
    autoRenew: true,
    notes: 'Fiyat teklifi sunuldu, karar kurulu bekleniyor.',
    modulesEnabled: {
      crm: true,
      offers: true,
      contracts: true,
      documents: true,
      analytics: false
    },
    lastLoginAt: 'Henüz Giriş Yapılmadı'
  }
];

export const initialSaaSOffers: SaaSOffer[] = [
  {
    id: 'saas-off-201',
    offerNumber: 'OFF-2026-042',
    tenantId: 'tenant-6',
    tenantName: 'Anadolu Bölge İSG Çözümleri A.Ş.',
    packageName: 'Pro',
    billingCycle: 'Yıllık',
    monthlyFee: 12083,
    annualFee: 145000,
    status: 'Gönderildi',
    createdAt: '2026-07-21',
    validUntil: '2026-08-04',
    onlineLink: 'https://app.codentra.com.tr/offer/OFF-2026-042',
    notes: '%15 Yıllık erken ödeme indirimi uygulandı.'
  },
  {
    id: 'saas-off-202',
    offerNumber: 'OFF-2026-039',
    tenantId: 'tenant-3',
    tenantName: 'Ege Risk Danışmanlık ve İSG San. Tic.',
    packageName: 'Starter',
    billingCycle: 'Aylık',
    monthlyFee: 6500,
    annualFee: 78000,
    status: 'Pazarlıkta',
    createdAt: '2026-07-15',
    validUntil: '2026-07-29',
    onlineLink: 'https://app.codentra.com.tr/offer/OFF-2026-039',
    notes: 'Kullanıcı limitini 5 kişiden 8 kişiye çıkarma talebindeler.'
  },
  {
    id: 'saas-off-203',
    offerNumber: 'OFF-2026-011',
    tenantId: 'tenant-1',
    tenantName: 'Metropol OSGB & Sağlık Hizmetleri A.Ş.',
    packageName: 'Pro',
    billingCycle: 'Yıllık',
    monthlyFee: 14500,
    annualFee: 174000,
    status: 'Kabul Edildi',
    createdAt: '2025-01-10',
    validUntil: '2025-01-24',
    onlineLink: 'https://app.codentra.com.tr/offer/OFF-2026-011',

    notes: 'Sözleşmeye dönüştürüldü.'
  }
];

export const initialSaaSContracts: SaaSContract[] = [
  {
    id: 'saas-cnt-101',
    contractNumber: 'SAAS-2025-001',
    tenantId: 'tenant-1',
    tenantName: 'Metropol OSGB & Sağlık Hizmetleri A.Ş.',
    packageName: 'Pro',
    annualFee: 174000,
    monthlyEquivalent: 14500,
    billingCycle: 'Yıllık',
    startDate: '2025-01-15',
    endDate: '2026-01-15',
    status: 'Aktif',
    signedAt: '2025-01-14 11:20',
    signedBy: 'Ahmet Yılmaz (Genel Müdür)'
  },
  {
    id: 'saas-cnt-102',
    contractNumber: 'SAAS-2024-089',
    tenantId: 'tenant-2',
    tenantName: 'Vip İş Sağlığı ve Güvenliği Ltd. Şti.',
    packageName: 'Enterprise',
    annualFee: 336000,
    monthlyEquivalent: 28000,
    billingCycle: 'Aylık',
    startDate: '2024-11-01',
    endDate: '2026-11-01',
    status: 'Aktif',
    signedAt: '2024-10-28 16:45',
    signedBy: 'Selin Aksoy'
  },
  {
    id: 'saas-cnt-103',
    contractNumber: 'SAAS-2025-044',
    tenantId: 'tenant-4',
    tenantName: 'Doğu Marmara Ortak Sağlık Güvenlik Birimi',
    packageName: 'Pro',
    annualFee: 174000,
    monthlyEquivalent: 14500,
    billingCycle: 'Yıllık',
    startDate: '2025-08-01',
    endDate: '2026-08-01',
    status: 'Yenilenecek',
    signedAt: '2025-07-29 09:30',
    signedBy: 'Erkan Demir'
  }
];

export const initialSaaSInvoices: SaaSInvoice[] = [
  {
    id: 'inv-901',
    invoiceNumber: 'SAAS-INV-2026-001',
    tenantId: 'tenant-1',
    tenantName: 'Metropol OSGB & Sağlık Hizmetleri A.Ş.',
    amount: 174000,
    billingPeriod: '2025 - 2026 Yıllık Lisans',
    status: 'Ödendi',
    issueDate: '2025-01-15',
    dueDate: '2025-01-25',
    paidAt: '2025-01-16 10:15'
  },
  {
    id: 'inv-902',
    invoiceNumber: 'SAAS-INV-2026-018',
    tenantId: 'tenant-2',
    tenantName: 'Vip İş Sağlığı ve Güvenliği Ltd. Şti.',
    amount: 28000,
    billingPeriod: 'Temmuz 2026 Aylık Lisans',
    status: 'Ödendi',
    issueDate: '2026-07-01',
    dueDate: '2026-07-10',
    paidAt: '2026-07-03 14:00'
  },
  {
    id: 'inv-903',
    invoiceNumber: 'SAAS-INV-2026-031',
    tenantId: 'tenant-4',
    tenantName: 'Doğu Marmara Ortak Sağlık Güvenlik Birimi',
    amount: 14500,
    billingPeriod: 'Temmuz 2026 Aylık Lisans',
    status: 'Gecikmede',
    issueDate: '2026-07-01',
    dueDate: '2026-07-15'
  }
];

export const initialSaaSEmailTemplates: SaaSEmailTemplate[] = [
  {
    id: 'tmpl-offer',
    type: 'offer',
    title: 'SaaS Lisans Teklifi İletim E-postası',
    subject: 'ESES Software - {FIRMA_ADI} İçin Özel SaaS Lisans Teklifi ({TEKLIF_NO})',
    body: `Sayın {YETKILI_ADI},

{FIRMA_ADI} firması için hazırladığımız özel Offer & Contract SaaS lisans teklifimiz ektedir.

Teklif Detayları:
- Önerilen Paket: {PAKET_ADI}
- Faturalama Periyodu: {PERIYOD}
- Lisans Ücreti: {TUTAR}

Teklifinizi çevrimiçi incelemek, onaylamak veya revizyon talep etmek için aşağıdaki bağlantıyı kullanabilirsiniz:
{ONAY_LINKI}

Saygılarımızla,
ESES Software SaaS Yönetimi Ekibi`
  },
  {
    id: 'tmpl-invitation',
    type: 'invitation',
    title: 'Kiracı Hesabı Şifre Belirleme & Aktivasyon E-postası',
    subject: 'Hoş Geldiniz! {FIRMA_ADI} SaaS Yönetim Hesabı Aktivasyonu',
    body: `Sayın {YETKILI_ADI},

{FIRMA_ADI} firmasına özel Offer & Contract SaaS yönetim hesabınız başarıyla tanımlanmıştır!

Kendi şifrenizi belirlemek ve sisteme ilk girişinizi yapmak için lütfen aşağıdaki güvenli aktivasyon bağlantısına tıklayın:
{DAVET_LINKI}

Sorularınız ve canlı destek için bize her zaman ulaşabilirsiniz.

Saygılarımızla,
ESES Software Super Admin Ekibi`
  },
  {
    id: 'tmpl-saas-contract',
    type: 'saas-contract',
    title: 'SaaS Hizmet & Lisans Sözleşmesi İletim E-postası',
    subject: 'ESES Software - {FIRMA_ADI} SaaS Yazılım Hizmet ve Lisans Sözleşmesi ({SOZLESME_NO})',
    body: `Sayın {YETKILI_ADI},

{FIRMA_ADI} ile şirketimiz arasında akdedilen Offer & Contract SaaS Yazılım Hizmet ve Lisans Sözleşmesi metni hazırlanmıştır.

Sözleşme Özeti:
- Sözleşme Numarası: {SOZLESME_NO}
- Kiracı Firma: {FIRMA_ADI}
- Lisans Paketi: {PAKET_ADI}
- Geçerlilik Tarihleri: {BASTAR_TARIHI} - {BITIS_TARIHI}
- Yıllık / Aylık Lisans Ücreti: {TUTAR}

Sözleşme dokümanınızı dijital olarak incelemek ve e-imza ile onaylamak için bağlantı:
{ONLINE_IMZA_LINKI}

İş birliğimizin hayırlı olmasını dileriz.

Saygılarımızla,
ESES Software Hukuk & Lisans Departmanı`
  }
];
