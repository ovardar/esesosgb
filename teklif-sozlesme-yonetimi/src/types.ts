export type SectionId =
  | 'saas-admin'
  | 'dashboard'
  | 'customers'
  | 'offers'
  | 'contracts'
  | 'documents'
  | 'price-lists'
  | 'permissions'
  | 'settings';

export type ThemeId = 'ivory' | 'graphite' | 'sage' | 'sand' | 'emerald' | 'nordic' | 'rose' | 'midnight' | 'obsidian' | 'deepcyan' | 'emeralddark' | 'violetdark';

export type SaaSPackage = 'Starter' | 'Pro' | 'Enterprise' | 'Custom';
export type SaaSSubscriptionStatus = 'Aktif' | 'Demo' | 'Askıda' | 'Aday' | 'İptal';
export type SaaSPaymentStatus = 'Sorunsuz' | 'Gecikmede' | 'Bekliyor';
export type SaaSHealthStatus = 'Mükemmel' | 'İyi' | 'Riskli' | 'Kritik';

export interface SaaSPackageDefinition {
  id: string;
  name: string;
  monthlyFee: number;
  annualFee: number;
  maxUsers: number;
  description: string;
  isPopular?: boolean;
  modulesEnabled: {
    crm: boolean;
    offers: boolean;
    contracts: boolean;
    documents: boolean;
    analytics: boolean;
  };
}

export interface SaaSTenant {
  id: string;
  tenantCode: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  package: SaaSPackage;
  status: SaaSSubscriptionStatus;
  paymentStatus: SaaSPaymentStatus;
  healthStatus: SaaSHealthStatus;
  monthlyFee: number;
  annualFee?: number;
  billingCycle?: '' | 'Aylık' | 'Yıllık';
  maxUsers: number;
  activeUsers: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  notes?: string;
  modulesEnabled: {
    crm: boolean;
    offers: boolean;
    contracts: boolean;
    documents: boolean;
    analytics: boolean;
  };
  lastLoginAt: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  activationStatus?: 'Davet Gönderilmedi' | 'Davet Gönderildi (Şifre Bekliyor)' | 'Hesap Aktif (Şifre Belirlendi)' | 'Şifre Belirlendi (Ödeme Bekliyor)';
  inviteSentAt?: string;
  passwordSetAt?: string;
  logoUrl?: string;
  trialEndsAt?: string;
  stripeCustomerId?: string;
  subscriptionPlanId?: string;
}

export interface SaaSOffer {
  id: string;
  offerNumber: string;
  tenantId: string;
  tenantName: string;
  packageName: string;
  billingCycle: 'Aylık' | 'Yıllık';
  monthlyFee: number;
  annualFee: number;
  status: 'Taslak' | 'Gönderildi' | 'Pazarlıkta' | 'Kabul Edildi' | 'Reddedildi';
  createdAt: string;
  validUntil: string;
  pdfUrl?: string;
  onlineLink?: string;
  notes?: string;
}

export interface SaaSContract {
  id: string;
  contractNumber: string;
  tenantId: string;
  tenantName: string;
  packageName: SaaSPackage;
  annualFee: number;
  monthlyEquivalent: number;
  billingCycle: 'Aylık' | 'Yıllık';
  startDate: string;
  endDate: string;
  status: 'Aktif' | 'Onay Bekliyor' | 'Yenilenecek' | 'Süresi Doldu' | 'İptal';
  pdfUrl?: string;
  signedAt?: string;
  signedBy?: string;
}

export interface SaaSInvoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  billingPeriod: string;
  status: 'Ödendi' | 'Bekliyor' | 'Gecikmede' | 'İptal';
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  pdfUrl?: string;
}

export interface SaaSEmailTemplate {
  id: string;
  type: 'offer' | 'invitation' | 'saas-contract' | 'general-notice';
  title: string;
  subject: string;
  body: string;
}

export type VatMode = 'KDV Hariç' | 'KDV Dahil';

export type RenewalPeriod = 'Aylık' | '3 Aylık' | '6 Aylık' | 'Yıllık' | '2 Yıllık' | 'Yok';

export type OfferServiceLine = {
  id: string;
  serviceName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  kdvPercent: number;
  lineTotal: number;
  renewalPeriod?: RenewalPeriod;
  nextRenewalDate?: string;
};

export type OfferRevision = {
  revisionNo: number;
  revisionDate: string;
  preparedBy: string;
  revisionNotes: string;
  services: OfferServiceLine[];
  overallDiscountType?: 'percent' | 'amount';
  overallDiscountValue?: number;
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  grandTotal: number;
  vatMode?: VatMode;
};

export type OfferRecord = {
  id: string;
  offerNo: string;
  customerName: string;
  subject: string;
  status: 'Taslak' | 'Hazırlanıyor' | 'Onay Bekliyor' | 'Gönderildi' | 'Revizyon İstendi' | 'Kazanıldı' | 'Kaybedildi';
  currentRevisionNo: number;
  createdDate: string;
  validUntilDate: string;
  owner: string;
  vatMode?: VatMode;
  revisions: OfferRevision[];
  priceListId?: string;
};

export type ContractStage =
  | 'Taslak'
  | 'Onay Bekliyor'
  | 'Aktif'
  | 'Revizyonda'
  | 'Yenilenecek'
  | 'Süresi Doldu'
  | 'Feshedildi';

export type PaymentMethod =
  | 'Banka Havalesi / EFT'
  | 'Kredi Kartı (Mail Order)'
  | 'Çek / Senet'
  | 'Nakit';

export type PaymentTerms =
  | 'Aylık Düzenli Fatura'
  | 'Peşin'
  | 'Peşinat + Taksit'
  | '30 Gün Vadeli'
  | '60 Gün Vadeli';

export type AcceptanceChannel =
  | 'Sistem Üzerinden'
  | 'Sözlü Onay (Telefon)'
  | 'E-posta'
  | 'WhatsApp'
  | 'Fiziki / Yazılı Onay';

export interface ContractServiceLine extends OfferServiceLine {
  renewalPeriod?: RenewalPeriod;
  nextRenewalDate?: string;
  notes?: string;
}

export interface ContractRevision {
  revisionNo: number;
  revisionDate: string;
  preparedBy: string;
  revisionNotes: string;
  contractTitle: string;
  startDate: string;
  endDate: string;
  services: ContractServiceLine[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  grandTotal: number;
  vatMode?: VatMode;
  assignedExpert?: string;
  assignedDoctor?: string;
  assignedDsp?: string;
  isgKatipNo?: string;
  paymentMethod?: PaymentMethod;
  paymentTerms?: PaymentTerms;
  autoRenew?: boolean;
}

export interface ContractRecord {
  id: string;
  contractNo: string;
  contractTitle: string;
  customerName: string;
  stage: ContractStage;
  offerId?: string;
  offerNo?: string;
  acceptanceChannel?: AcceptanceChannel;
  acceptanceNotes?: string;
  startDate: string;
  endDate: string;
  currentRevisionNo: number;
  createdDate: string;
  owner: string;
  vatMode?: VatMode;
  assignedExpert?: string;
  assignedDoctor?: string;
  assignedDsp?: string;
  isgKatipNo?: string;
  paymentMethod: PaymentMethod;
  paymentTerms: PaymentTerms;
  billingCycle: 'Aylık' | '3 Aylık' | '6 Aylık' | 'Yıllık';
  autoRenew: boolean;
  revisions: ContractRevision[];
  notes?: string;
}

export type DocumentCategory =
  | 'Sözleşme'
  | 'Ek Protokol / Revizyon'
  | 'Teklif Dokümanı'
  | 'Saha & Risk Analiz Raporu'
  | 'Sağlık Muayene Formu'
  | 'Sertifika / Eğitim'
  | 'Diğer';

export type DocumentStatus =
  | 'Onaylandı / Bağlandı'
  | 'Eşleşmedi / Havuzda'
  | 'İmza Bekliyor'
  | 'Arşiv';

export interface DocumentRecord {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: 'PDF' | 'DOCX' | 'XLSX' | 'ZIP' | 'Görsel';
  category: DocumentCategory;
  customerName?: string;
  linkedContractNo?: string;
  linkedOfferNo?: string;
  uploadDate: string;
  uploadedBy: string;
  status: DocumentStatus;
  matchConfidence?: number;
  notes?: string;
}

export interface PriceList {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at?: string;
}

export interface PriceRule {
  id: string;
  danger_class: 'Az Tehlikeli' | 'Tehlikeli' | 'Çok Tehlikeli';
  min_emp: number;
  max_emp: number | null;
  service_name: string;
  price: number;
  price_list_id?: string;
}

export interface SuperAdminUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  addedAt?: string;
}
