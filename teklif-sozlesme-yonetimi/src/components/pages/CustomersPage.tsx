import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

import { comprehensiveNaceList, searchNaceCodes } from '../../data/naceCodes';
import { turkeyCities, getDistrictsForCity } from '../../data/turkeyLocationData';
import { customerSeeds, offerSeeds, documentSeeds } from '../../data/workbench';
import { contractSeeds } from '../../data/contractSeeds';
import { supabase } from '../../lib/supabase';
import {
  AcceptanceChannel,
  ContractRecord,
  ContractRevision,
  ContractServiceLine,
  ContractStage,
  OfferRecord,
  OfferRevision,
  OfferServiceLine,
  PaymentMethod,
  PaymentTerms,
  RenewalPeriod,
  VatMode,
  SaaSTenant,
  DocumentRecord,
  DocumentCategory
} from '../../types';
import { PriceRule } from './PriceListsPage';
import { OfferPdfPreviewModal, ContractPdfPreviewModal } from '../modals/PdfPreviewModals';
import { ContractRevisionDiffView } from '../ContractRevisionDiffView';
import { DataImportWizardModal } from '../modals/DataImportWizardModal';

export type CustomerContact = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  extension?: string;
  isPrimary?: boolean;
  roles?: string[];
  notes?: string;
};

export const contactRoleOptions = [
  { value: 'primary', label: 'Birincil İletişim', icon: '⭐' },
  { value: 'invoice', label: 'Fatura Kişisi', icon: '🧾' },
  { value: 'contract', label: 'Sözleşme Yetkilisi', icon: '📑' },
  { value: 'ik', label: 'İK Yetkilisi', icon: '👥' },
  { value: 'muhasebe', label: 'Muhasebe', icon: '💼' },
  { value: 'operasyon', label: 'Operasyon Sorumlusu', icon: '⚙️' },
  { value: 'isg', label: 'İSG Sorumlusu', icon: '🛡️' },
  { value: 'saha', label: 'Saha Sorumlusu', icon: '🚜' }
];

export const CONTRACT_ISG_EXPERTS_LIST = [
  { name: 'Ayşe Yılmaz (A Sınıfı İSG Uzmanı)', role: 'A Sınıfı İSG Uzmanı', userType: '💻 Sistem Kullanıcısı' },
  { name: 'Mert Demir (B Sınıfı İSG Uzmanı)', role: 'B Sınıfı İSG Uzmanı', userType: '💻 Sistem Kullanıcısı' },
  { name: 'Elif Kaya (A Sınıfı İSG Uzmanı)', role: 'A Sınıfı İSG Uzmanı', userType: '📋 Saha Kadrosu' },
  { name: 'Ahmet Can (B Sınıfı İSG Uzmanı)', role: 'B Sınıfı İSG Uzmanı', userType: '📋 Saha Kadrosu' },
  { name: 'Mustafa Şahin (C Sınıfı İSG Uzmanı)', role: 'C Sınıfı İSG Uzmanı', userType: '📋 Saha Kadrosu' }
];

export const CONTRACT_WORKPLACE_DOCTORS_LIST = [
  { name: 'Dr. Mehmet Öz (İşyeri Hekimi)', role: 'İşyeri Hekimi', userType: '📋 Saha Kadrosu' },
  { name: 'Dr. Zeynep Erdem (İşyeri Hekimi)', role: 'İşyeri Hekimi', userType: '💻 Sistem Kullanıcısı' },
  { name: 'Dr. Selim Koç (İşyeri Hekimi)', role: 'İşyeri Hekimi', userType: '📋 Saha Kadrosu' },
  { name: 'Dr. Canan Taş (İşyeri Hekimi)', role: 'İşyeri Hekimi', userType: '💻 Sistem Kullanıcısı' }
];

export const CONTRACT_DSP_LIST = [
  { name: 'Hemşire Fatma Yıldız (DSP)', role: 'DSP', userType: '📋 Saha Kadrosu' },
  { name: 'Sağlık Memuru Ali Sunal (DSP)', role: 'DSP', userType: '📋 Saha Kadrosu' }
];

export type CustomerActivity = {
  id: string;
  type: 'Telefon' | 'Toplantı' | 'E-posta' | 'WhatsApp' | 'Ziyaret' | 'Not' | 'Demo' | 'Sunum';
  date: string;
  time?: string;
  contactPerson?: string;
  performedBy?: string;
  owner: string;
  subject: string;
  summary: string;
  actionNote?: string;
  status: 'Planlandı' | 'Tamamlandı' | 'İptal Edildi';
  reminderOffset?: 'at_time' | '15m' | '30m' | '1h' | '1d' | 'none';
  fileName?: string;
  fileDataUrl?: string;
  fileSize?: string;
};

export type CustomerRecord = {
  id?: string;
  name: string;
  status: string;
  stage: string;
  owner: string;
  city: string;
  district: string;
  hazardClass: string;
  sector: string;
  employeeCount: number;
  disabledEmployeeCount?: number;
  specialGroupsNotes?: string;
  contact?: string;
  phone?: string;
  email?: string;
  service?: string;
  offer?: string;
  contract?: string;
  note?: string;
  taxNo?: string;
  taxOffice?: string;
  naceCode?: string;
  website?: string;
  address?: string;
  leadSource?: string;
  requestedServices?: string[];
  visitFrequency?: string;
  needsAnalysisNotes?: string;
  contactsList?: CustomerContact[];
  activitiesList?: CustomerActivity[];
  locationCount?: number | string;
  shiftStructure?: string;
  expertClassNeed?: string;
  doctorMonthlyHours?: number | string;
  expertMonthlyHours?: number | string;
  offers: string[];
  contracts: string[];
};

export function calculateIsgStatutoryHours(employeeCount: number, hazardClass: string) {
  const count = Number(employeeCount) || 0;
  const hazard = (hazardClass || 'Tehlikeli').trim();

  let doctorMinsPerPerson = 5;
  let expertMinsPerPerson = 10;
  let defaultExpertClass = 'C Sınıfı';

  if (hazard === 'Çok Tehlikeli') {
    doctorMinsPerPerson = 15;
    expertMinsPerPerson = 40;
    defaultExpertClass = 'A Sınıfı';
  } else if (hazard === 'Tehlikeli') {
    doctorMinsPerPerson = 10;
    expertMinsPerPerson = 20;
    defaultExpertClass = 'B Sınıfı';
  } else {
    // Az Tehlikeli
    doctorMinsPerPerson = 5;
    expertMinsPerPerson = 10;
    defaultExpertClass = 'C Sınıfı';
  }

  const doctorHours = Math.round((count * doctorMinsPerPerson) / 60);
  const expertHours = Math.round((count * expertMinsPerPerson) / 60);

  return {
    doctorHours,
    expertHours,
    defaultExpertClass
  };
}

type CustomerTab = 'firm-bilgileri' | 'iletisim-kisileri' | 'aktiviteler' | 'teklifler' | 'sozlesmeler' | 'dokumanlar';
type CustomerSortKey = 'name' | 'status' | 'location' | 'hazardClass' | 'sector' | 'employeeCount' | 'owner';
type SortDirection = 'asc' | 'desc';
type FormErrors = Partial<Record<keyof NewCustomerForm, string>>;

type NewCustomerForm = {
  name: string;
  taxNo: string;
  taxOffice: string;
  sector: string;
  naceCode: string;
  hazardClass: string;
  employeeCount: string;
  disabledEmployeeCount: string;
  specialGroupsNotes: string;
  city: string;
  district: string;
  website: string;
  stage: string;
  status: string;
  leadSource: string;
  owner: string;
  address: string;
  notes: string;
};

type NaceItem = {
  nace_code: string;
  description: string;
  danger_class: string | null;
};

type AuthContext = {
  email: string;
  tenantId: string;
};

const customerTabs: Array<{ id: CustomerTab; label: string; icon: string }> = [
  { id: 'firm-bilgileri', label: 'Firma Bilgileri & İhtiyaç Analizi', icon: '🏢' },
  { id: 'iletisim-kisileri', label: 'İletişim Kişileri', icon: '👥' },
  { id: 'aktiviteler', label: 'Aktiviteler', icon: '📅' },
  { id: 'teklifler', label: 'Teklifler', icon: '📄' },
  { id: 'sozlesmeler', label: 'Sözleşmeler', icon: '📜' },
  { id: 'dokumanlar', label: 'Dokümanlar & Evraklar', icon: '📂' }
];

const allOption = 'Tümü';

const defaultNaceList: NaceItem[] = [
  { nace_code: '28.11.01', description: 'Motor ve türbin imalatı (Rüzgar, gaz, su ve buhar türbinleri)', danger_class: 'Tehlikeli' },
  { nace_code: '52.10.02', description: 'Depolama ve antrepoculuk faaliyetleri (Soğuk hava depoları dahil)', danger_class: 'Tehlikeli' },
  { nace_code: '35.11.02', description: 'Elektrik enerjisi üretimi (Termik, hidroelektrik, rüzgar, güneş)', danger_class: 'Çok Tehlikeli' },
  { nace_code: '20.14.01', description: 'Diğer organik temel kimyasalların imalatı', danger_class: 'Çok Tehlikeli' },
  { nace_code: '41.20.01', description: 'İkamet amaçlı binaların inşaatı (Müstakil ve çok aileli)', danger_class: 'Çok Tehlikeli' },
  { nace_code: '13.92.01', description: 'Yatak örtüsü, perde, masa örtüsü vb. tekstil ürünleri imalatı', danger_class: 'Az Tehlikeli' },
  { nace_code: '10.89.01', description: 'Hazır çorba, et suyu, maya vb. gıda maddeleri imalatı', danger_class: 'Tehlikeli' },
  { nace_code: '62.01.01', description: 'Bilgisayar programlama faaliyetleri (Yazılım geliştirme)', danger_class: 'Az Tehlikeli' },
  { nace_code: '86.10.01', description: 'Hastane hizmetleri (Yataklı tedavi kurumları)', danger_class: 'Çok Tehlikeli' },
  { nace_code: '47.11.01', description: 'Bakkal ve marketlerde yapılan perakende ticaret', danger_class: 'Az Tehlikeli' },
  { nace_code: '43.21.01', description: 'Bina ve bina dışı yapıların elektrik tesisatı imalatı', danger_class: 'Çok Tehlikeli' },
  { nace_code: '25.62.01', description: 'Metallerin makinede işlenmesi (Torna, tesviye, frezeleme)', danger_class: 'Tehlikeli' }
];

const availableServicesList = [
  'İSG Uzmanı Hizmeti',
  'İşyeri Hekimi Hizmeti',
  'DSP (Diğer Sağlık Personeli)',
  'Patlamadan Korunma Dokümanı',
  'Periyodik Kontroller & Ölçümler',
  'İlk Yardım Eğitimi',
  'Mobil Sağlık Tarama'
];

const visitFrequencyOptions = ['Haftalık', 'İki Haftada Bir', 'Aylık', '3 Aylık'];
const stageOptions = ['Yeni Kayıt', 'İhtiyaç Analizi', 'Görüşme', 'Teklif Verildi', 'Pazarlık / Revizyon', 'Sözleşme Onayı', 'Kazanıldı', 'Kaybedildi'];
const leadStatusOptions = ['Aktif', 'Aday', 'Teklif Bekliyor', 'Sözleşme Revizyonunda', 'Askıda', 'Pasif', 'Kaybedildi'];
const hazardClassOptions = ['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'];
const leadSourceOptions = [
  'Web Sitesi Formu',
  'Tavsiye / Referans',
  'Soğuk Arama / Saha Ziyareti',
  'Fuar / Etkinlik',
  'Sosyal Medya / Dijital Reklam',
  'İhale / İhale Bülteni',
  'Mevcut Müşteri Yönlendirmesi',
  'Diğer'
];

const defaultForm: NewCustomerForm = {
  name: '',
  taxNo: '',
  taxOffice: '',
  sector: '',
  naceCode: '',
  hazardClass: '',
  employeeCount: '',
  disabledEmployeeCount: '',
  specialGroupsNotes: '',
  city: '',
  district: '',
  website: '',
  stage: 'Yeni Kayıt',
  status: 'Teklif Bekliyor',
  leadSource: 'Telefon',
  owner: '',
  address: '',
  notes: ''
};

const createOptions = (values: (string | undefined)[]) => [
  allOption,
  ...Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort((l, r) => l.localeCompare(r, 'tr-TR'))
];

const OFFER_STATUS_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  'Taslak': { bg: 'rgba(148, 163, 184, 0.16)', color: '#64748b', label: '📝 Taslak' },
  'Hazırlanıyor': { bg: 'rgba(59, 130, 246, 0.16)', color: '#3b82f6', label: '⚙️ Hazırlanıyor' },
  'Onay Bekliyor': { bg: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', label: '⏳ Onay Bekliyor' },
  'Gönderildi': { bg: 'rgba(99, 102, 241, 0.16)', color: '#6366f1', label: '✉️ Gönderildi' },
  'Revizyon İstendi': { bg: 'rgba(236, 72, 153, 0.16)', color: '#ec4899', label: '🔄 Revizyon İstendi' },
  'Kazanıldı': { bg: 'rgba(16, 185, 129, 0.16)', color: '#10b981', label: '🏆 Kazanıldı (Sözleşme)' },
  'Kaybedildi': { bg: 'rgba(239, 68, 68, 0.16)', color: '#ef4444', label: '✕ Kaybedildi' }
};

export function computeOfferFinancials(
  lines: OfferServiceLine[],
  overallDiscountType: 'percent' | 'amount' = 'percent',
  overallDiscountValue: number = 0,
  vatMode: VatMode = 'KDV Hariç'
) {
  if (vatMode === 'KDV Dahil') {
    let grossInclusive = 0;
    (lines || []).forEach((l) => {
      grossInclusive += (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
    });

    let discountTotal = 0;
    if (overallDiscountType === 'percent') {
      discountTotal = Math.round(grossInclusive * ((Number(overallDiscountValue) || 0) / 100));
    } else {
      discountTotal = Math.min(grossInclusive, Math.round(Number(overallDiscountValue) || 0));
    }

    const netInclusive = grossInclusive - discountTotal;
    const discountRatio = grossInclusive > 0 ? netInclusive / grossInclusive : 1;

    let subtotal = 0; // KDV Hariç Matrah Toplamı
    let taxAmount = 0; // KDV Tutarı Toplamı

    (lines || []).forEach((l) => {
      const lineInclusive = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * discountRatio;
      const kdvRate = (Number(l.kdvPercent) || 20) / 100;
      const lineNet = Math.round(lineInclusive / (1 + kdvRate));
      const lineTax = Math.round(lineInclusive - lineNet);
      subtotal += lineNet;
      taxAmount += lineTax;
    });

    const grandTotal = netInclusive;
    return { subtotal, discountTotal, taxAmount, grandTotal };
  } else {
    let subtotal = 0;
    (lines || []).forEach((l) => {
      subtotal += (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
    });

    let discountTotal = 0;
    if (overallDiscountType === 'percent') {
      discountTotal = Math.round(subtotal * ((Number(overallDiscountValue) || 0) / 100));
    } else {
      discountTotal = Math.min(subtotal, Math.round(Number(overallDiscountValue) || 0));
    }

    const discountRatio = subtotal > 0 ? (subtotal - discountTotal) / subtotal : 1;

    let taxAmount = 0;
    (lines || []).forEach((l) => {
      const lineNet = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * discountRatio;
      taxAmount += Math.round(lineNet * ((Number(l.kdvPercent) || 0) / 100));
    });

    const netSubtotal = subtotal - discountTotal;
    const grandTotal = netSubtotal + taxAmount;

    return { subtotal, discountTotal, taxAmount, grandTotal };
  }
}

function computeContractFinancialsLocal(services: ContractServiceLine[], vatMode: VatMode = 'KDV Hariç') {
  let subtotal = 0;
  let taxAmount = 0;
  let grandTotal = 0;

  if (vatMode === 'KDV Dahil') {
    let grossInclusive = 0;
    (services || []).forEach((s) => {
      const qty = Number(s.quantity) || 0;
      const price = Number(s.unitPrice) || 0;
      const lineInclusive = (!isNaN(Number(s.lineTotal)) && Number(s.lineTotal) > 0) ? Number(s.lineTotal) : Math.round(qty * price);
      grossInclusive += lineInclusive;

      const kdv = (!isNaN(Number(s.kdvPercent))) ? Number(s.kdvPercent) : 20;
      const lineNet = lineInclusive / (1 + (kdv / 100));
      const lineTax = lineInclusive - lineNet;
      subtotal += lineNet;
      taxAmount += lineTax;
    });

    subtotal = Math.round(subtotal);
    taxAmount = Math.round(taxAmount);
    grandTotal = Math.round(grossInclusive);
  } else {
    (services || []).forEach((s) => {
      const qty = Number(s.quantity) || 0;
      const price = Number(s.unitPrice) || 0;
      const lineNet = (!isNaN(Number(s.lineTotal)) && Number(s.lineTotal) > 0) ? Number(s.lineTotal) : Math.round(qty * price);
      const kdv = (!isNaN(Number(s.kdvPercent))) ? Number(s.kdvPercent) : 20;
      const lineTax = Math.round(lineNet * (kdv / 100));
      subtotal += lineNet;
      taxAmount += lineTax;
    });
    subtotal = Math.round(subtotal);
    taxAmount = Math.round(taxAmount);
    grandTotal = Math.round(subtotal + taxAmount);
  }

  return { subtotal, discountTotal: 0, taxAmount, grandTotal };
}

const CONTRACT_STAGE_BADGES: Record<ContractStage, { bg: string; color: string; label: string }> = {
  Taslak: { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b', label: '📝 Taslak' },
  'Onay Bekliyor': { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', label: '⏳ Onay Bekliyor' },
  Aktif: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', label: '✅ Aktif' },
  Revizyonda: { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', label: '🔄 Revizyonda' },
  Yenilenecek: { bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', label: '⏰ Yenilenecek' },
  'Süresi Doldu': { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', label: '🛑 Süresi Doldu' },
  Feshedildi: { bg: 'rgba(107, 114, 128, 0.12)', color: '#6b7280', label: '✕ Feshedildi' }
};

function calculateDefaultEndDateLocal(startDateStr: string): string {
  if (!startDateStr) return '';
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function calculateDaysLeftLocal(dateStr?: string): number {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 999;
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getRevisionTypeBadge(rev?: ContractRevision | null) {
  if (!rev) return { label: '📝 Sürüm', miniLabel: 'Rev. 1', bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b', isBulk: false };
  const isBulk = (rev.preparedBy && rev.preparedBy.includes('Toplu Zam Motoru')) || (rev.revisionNotes && rev.revisionNotes.includes('Toplu'));
  const isRenewal = rev.revisionNotes && rev.revisionNotes.includes('1 Yıllık Periyodik Sözleşme Yenileme');

  if (isBulk) {
    return {
      isBulk: true,
      label: '⚡ TOPLU ZAM EK PROTOKOLÜ (Toplu Zam Motoru)',
      miniLabel: '⚡ Toplu Zam',
      bg: 'rgba(245, 158, 11, 0.18)',
      color: '#d97706',
      border: '1px solid rgba(245, 158, 11, 0.4)'
    };
  }
  if (isRenewal) {
    return {
      isBulk: false,
      label: '⏰ PERİYODİK YENİLEME PROTOKOLÜ (1 Yıl Uzatma)',
      miniLabel: '⏰ 1 Yıl Uzatma',
      bg: 'rgba(16, 185, 129, 0.16)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.4)'
    };
  }
  return {
    isBulk: false,
    label: '🔄 MANUEL REVİZYON / EK PROTOKOL',
    miniLabel: '🔄 Revizyon',
    bg: 'rgba(99, 102, 241, 0.12)',
    color: '#6366f1',
    border: '1px solid rgba(99, 102, 241, 0.3)'
  };
}

function CustomerContractsTab({
  customer,
  setCustomers
}: {
  customer: CustomerRecord;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRecord[]>>;
}) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const initialEndDateStr = useMemo(() => calculateDefaultEndDateLocal(todayStr), [todayStr]);

  const [contracts, setContracts] = useState<ContractRecord[]>(() => {
    try {
      const stored = localStorage.getItem('crm_contracts_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return contractSeeds;
  });

  const [offers] = useState<OfferRecord[]>(() => {
    try {
      const stored = localStorage.getItem('crm_offers_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return offerSeeds;
  });

  const [priceRules] = useState<PriceRule[]>(() => {
    try {
      const stored = localStorage.getItem('crm_price_list_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_contracts_v3', JSON.stringify(contracts));
    } catch (e) {
      console.error(e);
    }
  }, [contracts]);

  const customerContracts = useMemo(() => {
    if (!customer?.name) return [];
    const targetName = customer.name.trim().toLowerCase();
    return (contracts || []).filter(
      (c) => c && c.customerName && c.customerName.trim().toLowerCase() === targetName
    );
  }, [contracts, customer?.name]);

  const getRevisions = (c?: ContractRecord | null): ContractRevision[] => {
    if (!c || !Array.isArray(c.revisions)) return [];
    return c.revisions;
  };

  const getLastRev = (c?: ContractRecord | null): ContractRevision | null => {
    const revs = getRevisions(c);
    return revs.length > 0 ? revs[revs.length - 1] : null;
  };

  // Modals & Action State
  const [activeContractForAction, setActiveContractForAction] = useState<ContractRecord | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // New & Edit & Revision & Renew Modal States
  const [newContractModalOpen, setNewContractModalOpen] = useState(false);
  const [editContractModalOpen, setEditContractModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [renewContractModalOpen, setRenewContractModalOpen] = useState(false);

  const [contractForm, setContractForm] = useState<{
    id?: string;
    contractTitle: string;
    stage: ContractStage;
    startDate: string;
    endDate: string;
    vatMode: VatMode;
    assignedExpert: string;
    assignedDoctor: string;
    assignedDsp: string;
    isgKatipNo: string;
    paymentMethod: PaymentMethod;
    paymentTerms: PaymentTerms;
    billingCycle: 'Aylık' | '3 Aylık' | '6 Aylık' | 'Yıllık';
    autoRenew: boolean;
    acceptanceChannel: AcceptanceChannel;
    acceptanceNotes: string;
    linkedOfferId: string;
    saveAsNewRevision: boolean;
    revisionNotes: string;
    services: ContractServiceLine[];
  }>({
    contractTitle: '',
    stage: 'Taslak',
    startDate: todayStr,
    endDate: initialEndDateStr,
    vatMode: 'KDV Hariç',
    assignedExpert: '',
    assignedDoctor: '',
    assignedDsp: '',
    isgKatipNo: '',
    paymentMethod: 'Banka Havalesi / EFT',
    paymentTerms: '30 Gün Vadeli',
    billingCycle: 'Aylık',
    autoRenew: true,
    acceptanceChannel: 'Sözlü Onay (Telefon)',
    acceptanceNotes: '',
    linkedOfferId: '',
    saveAsNewRevision: false,
    revisionNotes: '',
    services: []
  });

  const [customLineInput, setCustomLineInput] = useState<{
    serviceName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    kdvPercent: number;
    renewalPeriod: RenewalPeriod;
    nextRenewalDate: string;
  }>({
    serviceName: '',
    unit: 'Saat/Ay',
    quantity: 1,
    unitPrice: 0,
    kdvPercent: 20,
    renewalPeriod: 'Yıllık',
    nextRenewalDate: initialEndDateStr
  });

  const [selectedPriceRuleId, setSelectedPriceRuleId] = useState('');

  const unitOptions = ['Saat/Ay', 'Aylık', 'Adet', 'Kişi/Ay', 'Kişi/Dönem', 'Paket', 'Yıllık'];

  const getFilteredPriceRulesForCustomer = (targetCustomerName: string) => {
    if (!targetCustomerName) return priceRules;
    const empCount = customer.employeeCount || 0;
    const hazard = customer.hazardClass;

    const matched = priceRules.filter((r) => {
      const hazardMatch = r.danger_class === hazard;
      const empMatch = empCount >= r.min_emp && (r.max_emp === null || r.max_emp === undefined || empCount <= r.max_emp);
      return hazardMatch && empMatch;
    });

    if (matched.length > 0) return matched;
    return priceRules.filter((r) => r.danger_class === hazard);
  };

  const handleAddPriceRuleLine = (
    customerName: string,
    currentLines: ContractServiceLine[],
    setLinesFn: (updated: ContractServiceLine[]) => void
  ) => {
    if (!selectedPriceRuleId) return;
    const rule = priceRules.find((r) => r.id === selectedPriceRuleId);
    if (!rule) return;

    const statutory = calculateIsgStatutoryHours(customer.employeeCount || 0, customer.hazardClass || 'Tehlikeli');
    let unit = 'Aylık';
    let qty = 1;
    const srv = rule.service_name;

    if (srv.includes('İSG Uzmanı') || srv.includes('Uzman')) {
      unit = 'Saat/Ay';
      qty = customer.expertMonthlyHours ? Number(customer.expertMonthlyHours) : statutory.expertHours;
    } else if (srv.includes('Hekim')) {
      unit = 'Saat/Ay';
      qty = customer.doctorMonthlyHours ? Number(customer.doctorMonthlyHours) : statutory.doctorHours;
    } else if (srv.includes('DSP') || srv.includes('Sağlık Personeli')) {
      unit = 'Aylık';
      qty = 1;
    }

    const lineTotal = Math.round(qty * Number(rule.price));
    const newLine: ContractServiceLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serviceName: rule.service_name,
      unit,
      quantity: qty,
      unitPrice: Number(rule.price),
      kdvPercent: 20,
      lineTotal,
      renewalPeriod: 'Yıllık',
      nextRenewalDate: contractForm.endDate || initialEndDateStr
    };

    setLinesFn([...currentLines, newLine]);
    setSelectedPriceRuleId('');
  };

  const handleAddCustomLine = (
    currentLines: ContractServiceLine[],
    setLinesFn: (updated: ContractServiceLine[]) => void
  ) => {
    if (!customLineInput.serviceName || !customLineInput.unitPrice) return;
    const lineTotal = Math.round((customLineInput.quantity || 1) * customLineInput.unitPrice);
    const newLine: ContractServiceLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serviceName: customLineInput.serviceName,
      unit: customLineInput.unit,
      quantity: customLineInput.quantity || 1,
      unitPrice: customLineInput.unitPrice,
      kdvPercent: customLineInput.kdvPercent || 20,
      lineTotal,
      renewalPeriod: customLineInput.renewalPeriod || 'Yıllık',
      nextRenewalDate: contractForm.endDate || initialEndDateStr
    };

    setLinesFn([...currentLines, newLine]);
    setCustomLineInput({
      serviceName: '',
      unit: 'Saat/Ay',
      quantity: 1,
      unitPrice: 0,
      kdvPercent: 20,
      renewalPeriod: 'Yıllık',
      nextRenewalDate: contractForm.endDate || initialEndDateStr
    });
  };

  // Quick percentage increase helper inside form
  const handleApplyPercentageIncreaseToForm = (percent: number) => {
    if (!percent || percent <= 0) return;
    setContractForm((prev) => ({
      ...prev,
      services: prev.services.map((s) => {
        const oldPrice = Number(s.unitPrice) || 0;
        const newPrice = Math.round(oldPrice * (1 + percent / 100));
        const lineTotal = Math.round(newPrice * (Number(s.quantity) || 1));
        return {
          ...s,
          unitPrice: newPrice,
          lineTotal
        };
      })
    }));
  };

  // Open Interactive Renewal Modal
  const handleOpenRenewModal = (cnt: ContractRecord) => {
    const lastRev = getLastRev(cnt);
    const oldEndDate = cnt.endDate || todayStr;
    const newStart = new Date(oldEndDate);
    newStart.setDate(newStart.getDate() + 1);
    const newStartStr = newStart.toISOString().split('T')[0];
    const newEndStr = calculateDefaultEndDateLocal(newStartStr);

    const mappedServices = (lastRev ? JSON.parse(JSON.stringify(lastRev.services)) : []).map((s: ContractServiceLine) => ({
      ...s,
      nextRenewalDate: newEndStr
    }));

    setContractForm({
      id: cnt.id,
      contractTitle: cnt.contractTitle,
      stage: 'Aktif',
      startDate: newStartStr,
      endDate: newEndStr,
      vatMode: lastRev?.vatMode || cnt.vatMode || 'KDV Hariç',
      assignedExpert: cnt.assignedExpert || '',
      assignedDoctor: cnt.assignedDoctor || '',
      assignedDsp: cnt.assignedDsp || '',
      isgKatipNo: cnt.isgKatipNo || '',
      paymentMethod: cnt.paymentMethod || 'Banka Havalesi / EFT',
      paymentTerms: cnt.paymentTerms || '30 Gün Vadeli',
      billingCycle: cnt.billingCycle || 'Aylık',
      autoRenew: true,
      acceptanceChannel: cnt.acceptanceChannel || 'Sözlü Onay (Telefon)',
      acceptanceNotes: cnt.acceptanceNotes || '',
      linkedOfferId: cnt.offerId || '',
      saveAsNewRevision: true,
      revisionNotes: `1 Yıllık Periyodik Sözleşme Yenileme Protokolü (${newStartStr} - ${newEndStr})`,
      services: mappedServices
    });

    setActiveContractForAction(cnt);
    setRenewContractModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setContractForm({
      contractTitle: `${customer.name} 2026-2027 İSG Hizmet Sözleşmesi`,
      stage: 'Taslak',
      startDate: todayStr,
      endDate: calculateDefaultEndDateLocal(todayStr),
      vatMode: 'KDV Hariç',
      assignedExpert: '',
      assignedDoctor: '',
      assignedDsp: '',
      isgKatipNo: '',
      paymentMethod: 'Banka Havalesi / EFT',
      paymentTerms: '30 Gün Vadeli',
      billingCycle: 'Aylık',
      autoRenew: true,
      acceptanceChannel: 'Sözlü Onay (Telefon)',
      acceptanceNotes: '',
      linkedOfferId: '',
      saveAsNewRevision: false,
      revisionNotes: '',
      services: []
    });
    setNewContractModalOpen(true);
  };

  const handleOpenEditModal = (cnt: ContractRecord) => {
    const lastRev = getLastRev(cnt);
    setContractForm({
      id: cnt.id,
      contractTitle: cnt.contractTitle,
      stage: cnt.stage,
      startDate: cnt.startDate,
      endDate: cnt.endDate,
      vatMode: lastRev?.vatMode || cnt.vatMode || 'KDV Hariç',
      assignedExpert: cnt.assignedExpert || '',
      assignedDoctor: cnt.assignedDoctor || '',
      assignedDsp: cnt.assignedDsp || '',
      isgKatipNo: cnt.isgKatipNo || '',
      paymentMethod: cnt.paymentMethod || 'Banka Havalesi / EFT',
      paymentTerms: cnt.paymentTerms || '30 Gün Vadeli',
      billingCycle: cnt.billingCycle || 'Aylık',
      autoRenew: cnt.autoRenew !== false,
      acceptanceChannel: cnt.acceptanceChannel || 'Sözlü Onay (Telefon)',
      acceptanceNotes: cnt.acceptanceNotes || '',
      linkedOfferId: cnt.offerId || '',
      saveAsNewRevision: false,
      revisionNotes: '',
      services: lastRev ? JSON.parse(JSON.stringify(lastRev.services)) : []
    });
    setActiveContractForAction(cnt);
    setEditContractModalOpen(true);
  };

  const handleOpenRevisionModal = (cnt: ContractRecord) => {
    const lastRev = getLastRev(cnt);
    setContractForm({
      id: cnt.id,
      contractTitle: cnt.contractTitle,
      stage: cnt.stage === 'Aktif' ? 'Revizyonda' : cnt.stage,
      startDate: cnt.startDate,
      endDate: cnt.endDate,
      vatMode: lastRev?.vatMode || cnt.vatMode || 'KDV Hariç',
      assignedExpert: cnt.assignedExpert || '',
      assignedDoctor: cnt.assignedDoctor || '',
      assignedDsp: cnt.assignedDsp || '',
      isgKatipNo: cnt.isgKatipNo || '',
      paymentMethod: cnt.paymentMethod || 'Banka Havalesi / EFT',
      paymentTerms: cnt.paymentTerms || '30 Gün Vadeli',
      billingCycle: cnt.billingCycle || 'Aylık',
      autoRenew: cnt.autoRenew !== false,
      acceptanceChannel: cnt.acceptanceChannel || 'Sözlü Onay (Telefon)',
      acceptanceNotes: cnt.acceptanceNotes || '',
      linkedOfferId: cnt.offerId || '',
      saveAsNewRevision: true,
      revisionNotes: `Fiyat / Hizmet Kalemi Güncelleme Ek Protokolü`,
      services: lastRev ? JSON.parse(JSON.stringify(lastRev.services)) : []
    });
    setActiveContractForAction(cnt);
    setRevisionModalOpen(true);
  };

  const handleSaveContractSubmit = (e: React.FormEvent, mode: 'new' | 'edit' | 'revision' | 'renew') => {
    e.preventDefault();

    const financials = computeContractFinancialsLocal(contractForm.services, contractForm.vatMode);
    const nowStr = todayStr + ' ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    if (mode === 'new') {
      const newContractNo = `SZL-2026-${Math.floor(100 + Math.random() * 900)}`;
      const initialRev: ContractRevision = {
        revisionNo: 1,
        revisionDate: nowStr,
        preparedBy: 'Ayşe Yılmaz (Sözleşme Sorumlusu)',
        revisionNotes: 'İlk Sözleşme Oluşturma',
        contractTitle: contractForm.contractTitle,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        assignedExpert: contractForm.assignedExpert,
        assignedDoctor: contractForm.assignedDoctor,
        isgKatipNo: contractForm.isgKatipNo,
        paymentMethod: contractForm.paymentMethod,
        paymentTerms: contractForm.paymentTerms,
        autoRenew: contractForm.autoRenew,
        services: contractForm.services,
        vatMode: contractForm.vatMode,
        ...financials
      };

      const newRecord: ContractRecord = {
        id: `cnt-cust-${Date.now()}`,
        contractNo: newContractNo,
        contractTitle: contractForm.contractTitle,
        customerName: customer.name,
        stage: contractForm.stage,
        offerId: contractForm.linkedOfferId || undefined,
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        currentRevisionNo: 1,
        createdDate: todayStr,
        owner: 'Ayşe Yılmaz',
        vatMode: contractForm.vatMode,
        assignedExpert: contractForm.assignedExpert,
        assignedDoctor: contractForm.assignedDoctor,
        isgKatipNo: contractForm.isgKatipNo,
        paymentMethod: contractForm.paymentMethod,
        paymentTerms: contractForm.paymentTerms,
        billingCycle: 'Aylık',
        autoRenew: contractForm.autoRenew,
        revisions: [initialRev]
      };

      setContracts((prev) => [newRecord, ...prev]);
      setNewContractModalOpen(false);
    } else {
      if (!activeContractForAction) return;

      const existingRevs = getRevisions(activeContractForAction);
      let newRevNo = activeContractForAction.currentRevisionNo || 1;
      let updatedRevs: ContractRevision[];

      if (contractForm.saveAsNewRevision || mode === 'revision' || mode === 'renew') {
        newRevNo += 1;
        const newRev: ContractRevision = {
          revisionNo: newRevNo,
          revisionDate: nowStr,
          preparedBy: 'Ayşe Yılmaz (Sözleşme Sorumlusu)',
          revisionNotes: contractForm.revisionNotes || `Revizyon #${newRevNo}`,
          contractTitle: contractForm.contractTitle,
          startDate: contractForm.startDate,
          endDate: contractForm.endDate,
          assignedExpert: contractForm.assignedExpert,
          assignedDoctor: contractForm.assignedDoctor,
          isgKatipNo: contractForm.isgKatipNo,
          paymentMethod: contractForm.paymentMethod,
          paymentTerms: contractForm.paymentTerms,
          autoRenew: contractForm.autoRenew,
          services: contractForm.services,
          vatMode: contractForm.vatMode,
          ...financials
        };
        updatedRevs = [...existingRevs, newRev];
      } else {
        const lastRevIndex = existingRevs.length - 1;
        const updatedLastRev: ContractRevision = {
          ...(existingRevs[lastRevIndex] || {
            revisionNo: 1,
            revisionDate: nowStr,
            preparedBy: 'Ayşe Yılmaz'
          }),
          contractTitle: contractForm.contractTitle,
          startDate: contractForm.startDate,
          endDate: contractForm.endDate,
          assignedExpert: contractForm.assignedExpert,
          assignedDoctor: contractForm.assignedDoctor,
          isgKatipNo: contractForm.isgKatipNo,
          paymentMethod: contractForm.paymentMethod,
          paymentTerms: contractForm.paymentTerms,
          autoRenew: contractForm.autoRenew,
          services: contractForm.services,
          vatMode: contractForm.vatMode,
          ...financials
        };
        updatedRevs = [...existingRevs];
        if (lastRevIndex >= 0) {
          updatedRevs[lastRevIndex] = updatedLastRev;
        } else {
          updatedRevs.push(updatedLastRev);
        }
      }

      setContracts((prev) =>
        prev.map((c) =>
          c.id === activeContractForAction.id
            ? {
                ...c,
                contractTitle: contractForm.contractTitle,
                stage: contractForm.stage,
                startDate: contractForm.startDate,
                endDate: contractForm.endDate,
                currentRevisionNo: newRevNo,
                vatMode: contractForm.vatMode,
                assignedExpert: contractForm.assignedExpert,
                assignedDoctor: contractForm.assignedDoctor,
                isgKatipNo: contractForm.isgKatipNo,
                paymentMethod: contractForm.paymentMethod,
                paymentTerms: contractForm.paymentTerms,
                autoRenew: contractForm.autoRenew,
                revisions: updatedRevs
              }
            : c
        )
      );

      setEditContractModalOpen(false);
      setRevisionModalOpen(false);
      setRenewContractModalOpen(false);
    }
  };

  const handleUpdateStage = (contractId: string, newStage: ContractStage) => {
    setContracts((prev) =>
      prev.map((c) => (c.id === contractId ? { ...c, stage: newStage } : c))
    );
  };

  // renewal alerts for this customer's contracts
  const customerRenewalAlerts = useMemo(() => {
    const alerts: { contract: ContractRecord; daysLeft: number; isExpired: boolean }[] = [];
    customerContracts.forEach((c) => {
      const days = calculateDaysLeftLocal(c.endDate);
      if (days <= 30 || c.stage === 'Süresi Doldu' || c.stage === 'Yenilenecek') {
        alerts.push({ contract: c, daysLeft: days, isExpired: days < 0 || c.stage === 'Süresi Doldu' });
      }
    });
    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [customerContracts]);

  const kpiStats = useMemo(() => {
    let totalVal = 0;
    let activeCount = 0;

    customerContracts.forEach((c) => {
      const lastRev = getLastRev(c);
      const val = lastRev ? (Number(lastRev.grandTotal) || 0) : 0;
      if (c.stage === 'Aktif') {
        activeCount++;
        totalVal += val;
      }
    });

    return {
      totalCount: customerContracts.length,
      activeCount,
      totalValue: totalVal
    };
  }, [customerContracts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* RENEWAL ALERT BANNER IF EXPIRED OR EXPIRING SOON */}
      {customerRenewalAlerts.length > 0 && (
        <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '12px 18px', borderRadius: 12, color: 'var(--text-main)' }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#d97706', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⏰ SÖZLEŞME YENİLEME HATIRLATMASI</span>
            <span className="mini-badge" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
              {customerRenewalAlerts.length} Adet Bildirim
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.86rem' }}>
            {customerRenewalAlerts.map((alt) => (
              <div key={alt.contract.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: 'var(--surface-strong)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span>
                  <strong>{alt.contract.contractNo}</strong> ({alt.contract.contractTitle}):{' '}
                  {alt.isExpired ? (
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>🛑 Süresi Doldu! ({alt.contract.endDate})</span>
                  ) : (
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏰ Son {alt.daysLeft} Gün ({alt.contract.endDate})</span>
                  )}
                </span>
                <button
                  type="button"
                  className="btn-action-primary"
                  onClick={() => handleOpenRenewModal(alt.contract)}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  ⚡ Yenileme Protokolü Aç / Düzenle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEADER & NEW CONTRACT BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>
            📜 {customer.name} - Müşteri Sözleşmeleri ({customerContracts.length})
          </h4>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Bu firmaya ait tüm aktif/geçmiş sözleşmeler, revizyonlar ve yenilemeler
          </span>
        </div>

        <button
          type="button"
          className="btn-action-primary"
          onClick={handleOpenNewModal}
          style={{ padding: '8px 18px', fontSize: '0.86rem' }}
        >
          + Bu Müşteriye Yeni Sözleşme Oluştur
        </button>
      </div>

      {/* KPI METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="panel panel-elevated" style={{ padding: '12px 16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Toplam Sözleşme</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
            {kpiStats.totalCount} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Adet</span>
          </div>
        </div>

        <div className="panel panel-elevated" style={{ padding: '12px 16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Aktif Yürürlükte</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
            {kpiStats.activeCount} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Aktif</span>
          </div>
        </div>

        <div className="panel panel-elevated" style={{ padding: '12px 16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Aktif Yıllık Hakediş</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>
            ₺{kpiStats.totalValue.toLocaleString('tr-TR')}
          </div>
        </div>
      </div>

      {/* CONTRACTS TABLE */}
      <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 14px' }}>Sözleşme No & Takip Adı</th>
              <th style={{ padding: '10px 14px' }}>Sürüm / Rev.</th>
              <th style={{ padding: '10px 14px' }}>Sözleşme Tutarı</th>
              <th style={{ padding: '10px 14px' }}>Başlangıç / Bitiş / Durum</th>
              <th style={{ padding: '10px 14px' }}>Atanan Kadro</th>
              <th style={{ padding: '10px 14px' }}>Aşama</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {customerContracts.length > 0 ? (
              customerContracts.map((cnt) => {
                const revs = getRevisions(cnt);
                const currentRev = getLastRev(cnt);
                const badge = CONTRACT_STAGE_BADGES[cnt.stage] || CONTRACT_STAGE_BADGES['Taslak'];
                const vMode = currentRev?.vatMode || cnt.vatMode || 'KDV Hariç';
                const grandTotalVal = currentRev ? (Number(currentRev.grandTotal) || 0) : 0;
                const daysLeft = calculateDaysLeftLocal(cnt.endDate);

                return (
                  <tr key={cnt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-main)' }}>
                      <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--accent)' }}>
                        {cnt.contractNo}
                      </strong>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {cnt.contractTitle}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      {(() => {
                        const revBadge = getRevisionTypeBadge(currentRev);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                            <button
                              type="button"
                              className="mini-badge"
                              onClick={() => {
                                setActiveContractForAction(cnt);
                                setHistoryModalOpen(true);
                              }}
                              style={{
                                cursor: 'pointer',
                                background: revBadge.bg,
                                color: revBadge.color,
                                border: revBadge.border || 'none',
                                fontWeight: 800,
                                fontSize: '0.78rem'
                              }}
                              title="Tüm Revizyon Geçmişini Gör"
                            >
                              {revBadge.miniLabel} (Rev. {cnt.currentRevisionNo || 1})
                            </button>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {revs.length} Sürüm Kayıtlı
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                      ₺{grandTotalVal.toLocaleString('tr-TR')}
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        ({vMode})
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>📅 {cnt.startDate}</div>
                      <div>⌛ {cnt.endDate}</div>
                      {daysLeft < 0 ? (
                        <span className="mini-badge" style={{ background: 'rgba(239, 68, 68, 0.16)', color: '#ef4444', border: 'none', fontSize: '0.7rem', marginTop: 2 }}>
                          🛑 Süresi Doldu ({Math.abs(daysLeft)} Gün)
                        </span>
                      ) : daysLeft <= 30 ? (
                        <span className="mini-badge" style={{ background: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', border: 'none', fontSize: '0.7rem', marginTop: 2 }}>
                          ⏰ Son {daysLeft} Gün
                        </span>
                      ) : null}
                    </td>

                    <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                      <div>👷 {cnt.assignedExpert || 'Uzman Atanmadı'}</div>
                      <div>🩺 {cnt.assignedDoctor || 'Hekim Atanmadı'}</div>
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={cnt.stage}
                        onChange={(e) => handleUpdateStage(cnt.id, e.target.value as any)}
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: 20,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Taslak">📝 Taslak</option>
                        <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
                        <option value="Aktif">✅ Aktif</option>
                        <option value="Revizyonda">🔄 Revizyonda</option>
                        <option value="Yenilenecek">⏰ Yenilenecek</option>
                        <option value="Süresi Doldu">🛑 Süresi Doldu</option>
                        <option value="Feshedildi">✕ Feshedildi</option>
                      </select>
                    </td>

                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                          onClick={() => handleOpenEditModal(cnt)}
                          title="Sözleşme Bilgilerini Düzenle"
                        >
                          ✏️ Düzenle
                        </button>

                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.76rem', color: '#6366f1' }}
                          onClick={() => handleOpenRevisionModal(cnt)}
                          title="Ek Protokol / Revizyon Oluştur"
                        >
                          🔄 Revizyon Yap
                        </button>

                        <button
                          type="button"
                          className="btn-action-primary"
                          style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                          onClick={() => handleOpenRenewModal(cnt)}
                          title="Sözleşmeyi 1 Yıl Uzat & Fiyatları Düzenle"
                        >
                          ⚡ 1 Yıl Uzat
                        </button>

                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                          onClick={() => {
                            setActiveContractForAction(cnt);
                            setPdfModalOpen(true);
                          }}
                          title="Sözleşmeyi İncele & Yazdır"
                        >
                          📄 Yazdır
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Bu müşteri için henüz kayıtlı sözleşme bulunmamaktadır.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW / EDIT / REVISION / RENEW CONTRACT FORM MODAL */}
      {(newContractModalOpen || editContractModalOpen || revisionModalOpen || renewContractModalOpen) && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div className="modal-content" style={{ background: 'var(--surface-strong)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 16, width: '92%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto', padding: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                  {newContractModalOpen
                    ? '📝 Bu Müşteriye Yeni Sözleşme Oluştur'
                    : renewContractModalOpen
                    ? '🔄 1 Yıllık Periyodik Sözleşme Yenileme & Fiyat Güncelleme'
                    : revisionModalOpen
                    ? '🔄 Sözleşme Ek Protokol / Revizyon Oluştur'
                    : '✏️ Sözleşme Düzenle'}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Müşteri: <strong>{customer.name}</strong></span>
              </div>
              <button
                type="button"
                className="btn-action-ghost"
                onClick={() => {
                  setNewContractModalOpen(false);
                  setEditContractModalOpen(false);
                  setRevisionModalOpen(false);
                  setRenewContractModalOpen(false);
                }}
              >
                ✕ Kapat
              </button>
            </div>

            <form onSubmit={(e) => handleSaveContractSubmit(e, newContractModalOpen ? 'new' : renewContractModalOpen ? 'renew' : revisionModalOpen ? 'revision' : 'edit')} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* BULK REVISION & DATE COMPARISON CONTEXT BANNER */}
              {activeContractForAction && (() => {
                const revs = activeContractForAction.revisions || [];
                const activeRev = revs[revs.length - 1];
                const prevRev = revs.length > 1 ? revs[revs.length - 2] : null;
                const isBulk = activeRev && ((activeRev.preparedBy && activeRev.preparedBy.includes('Toplu Zam Motoru')) || (activeRev.revisionNotes && activeRev.revisionNotes.includes('Toplu')));

                if (!isBulk && !prevRev) return null;

                return (
                  <div style={{ background: isBulk ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.08)', border: isBulk ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)', padding: 14, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <strong style={{ color: isBulk ? '#d97706' : '#6366f1', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{isBulk ? '⚡' : '🔄'}</span> DÜZENLENEN SÜRÜM: {isBulk ? 'TOPLU ZAM EK PROTOKOLÜ' : 'SÖZLEŞME REVİZYONU'} (Revizyon #{activeRev?.revisionNo || activeContractForAction.currentRevisionNo})
                      </strong>
                      {isBulk && (
                        <span style={{ fontSize: '0.74rem', background: '#d97706', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                          Toplu Zam Motoru Kaydı
                        </span>
                      )}
                    </div>
                    {activeRev && (
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        📝 {activeRev.revisionNotes} (Protokol Tarihi: {activeRev.revisionDate} · {activeRev.preparedBy})
                      </div>
                    )}
                    {prevRev && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--surface-strong)', padding: 10, borderRadius: 8, fontSize: '0.8rem', border: '1px dashed rgba(245, 158, 11, 0.4)', marginTop: 4 }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>⏮️ Önceki Sözleşme Dönemi & Tutarı (Rev. #{prevRev.revisionNo}):</span>
                          <strong>📅 {prevRev.startDate || '—'} ~ {prevRev.endDate || '—'}</strong>
                          <div style={{ color: 'var(--text-muted)', marginTop: 2, fontWeight: 700 }}>₺{(Number(prevRev.grandTotal) || 0).toLocaleString('tr-TR')} /ay</div>
                        </div>
                        <div>
                          <span style={{ color: isBulk ? '#d97706' : '#6366f1', display: 'block', marginBottom: 2, fontWeight: 700 }}>⚡ Güncel Zamlı Protokol Dönemi & Tutarı (Rev. #{activeRev?.revisionNo}):</span>
                          <strong style={{ color: isBulk ? '#d97706' : '#6366f1' }}>📅 {contractForm.startDate} ~ {contractForm.endDate} (1 Yıl Geçerli)</strong>
                          <div style={{ color: isBulk ? '#d97706' : '#6366f1', fontWeight: 800, marginTop: 2 }}>₺{(Number(activeRev?.grandTotal) || 0).toLocaleString('tr-TR')} /ay</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* 📌 GRUP 1: TEMEL SÖZLEŞME & GEÇERLİLİK BİLGİLERİ */}
              <details className="form-accordion-section" open>
                <summary>
                  <span>📌 1. Temel Sözleşme & Geçerlilik Bilgileri</span>
                  <span className="accordion-status-badge">Aç / Kapat ▼</span>
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Müşteri Firma *</label>
                      <input
                        type="text"
                        readOnly
                        value={customer.name}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text-main)', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                        🔗 Bağlı Teklif (İsteğe Bağlı)
                      </label>
                      {(() => {
                        const custOffers = offers.filter((o) => o.customerName === customer.name);
                        const activeOffers = custOffers.filter((o) => o.status !== 'Kazanıldı' && o.status !== 'Kaybedildi');
                        const completedOffers = custOffers.filter((o) => o.status === 'Kazanıldı');
                        const closedOffers = custOffers.filter((o) => o.status === 'Kaybedildi');

                        return (
                          <select
                            value={contractForm.linkedOfferId}
                            onChange={(e) => {
                              const offId = e.target.value;
                              const selectedOff = offers.find((o) => o.id === offId);
                              if (selectedOff) {
                                const lastRev = selectedOff.revisions[selectedOff.revisions.length - 1];
                                setContractForm((prev) => ({
                                  ...prev,
                                  linkedOfferId: offId,
                                  services: (lastRev ? lastRev.services : []).map((s) => ({
                                    ...s,
                                    renewalPeriod: s.renewalPeriod || 'Yıllık',
                                    nextRenewalDate: prev.endDate
                                  }))
                                }));
                              } else {
                                setContractForm((prev) => ({ ...prev, linkedOfferId: '' }));
                              }
                            }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600 }}
                          >
                            <option value="">-- Teklif Bağlantısı Yok --</option>
                            {activeOffers.length > 0 && (
                              <optgroup label={`🟢 GÜNCEL AÇIK TEKLİFLER (${activeOffers.length})`}>
                                {activeOffers.map((off) => {
                                  const activeRev = off.revisions[off.revisions.length - 1];
                                  const priceVal = activeRev ? activeRev.grandTotal : 0;
                                  return (
                                    <option key={off.id} value={off.id}>
                                      🟢 {off.offerNo} - {off.subject} (₺{priceVal.toLocaleString('tr-TR')} - {off.status})
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                            {completedOffers.length > 0 && (
                              <optgroup label={`⚪ KAZANILMIŞ / SÖZLEŞMELİ TEKLİFLER (${completedOffers.length})`}>
                                {completedOffers.map((off) => {
                                  const activeRev = off.revisions[off.revisions.length - 1];
                                  const priceVal = activeRev ? activeRev.grandTotal : 0;
                                  return (
                                    <option key={off.id} value={off.id}>
                                      ⚪ {off.offerNo} - {off.subject} (₺{priceVal.toLocaleString('tr-TR')} - Kazanıldı)
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                            {closedOffers.length > 0 && (
                              <optgroup label={`🔴 KAPATILMIŞ / KAYBEDİLEN TEKLİFLER (${closedOffers.length})`}>
                                {closedOffers.map((off) => {
                                  const activeRev = off.revisions[off.revisions.length - 1];
                                  const priceVal = activeRev ? activeRev.grandTotal : 0;
                                  return (
                                    <option key={off.id} value={off.id}>
                                      🔴 {off.offerNo} - {off.subject} (₺{priceVal.toLocaleString('tr-TR')} - Kaybedildi)
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                          </select>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>
                      Sözleşme Takip Adı *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Alfa OSGB 2026-2027 Yıllık Ana Hizmet Sözleşmesi"
                      value={contractForm.contractTitle}
                      onChange={(e) => setContractForm({ ...contractForm, contractTitle: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Sözleşme Aşaması *</label>
                      <select
                        value={contractForm.stage}
                        onChange={(e) => setContractForm({ ...contractForm, stage: e.target.value as ContractStage })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                      >
                        <option value="Taslak">📝 Taslak (Varsayılan)</option>
                        <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
                        <option value="Aktif">✅ Aktif</option>
                        <option value="Revizyonda">🔄 Revizyonda</option>
                        <option value="Yenilenecek">⏰ Yenilenecek</option>
                        <option value="Süresi Doldu">🛑 Süresi Doldu</option>
                        <option value="Feshedildi">✕ Feshedildi</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Fiyatlandırma Tipi (KDV Durumu) *</label>
                      <select
                        value={contractForm.vatMode}
                        onChange={(e) => setContractForm({ ...contractForm, vatMode: e.target.value as VatMode })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--accent)', fontWeight: 700 }}
                      >
                        <option value="KDV Hariç">KDV Hariç Fiyatlar (Varsayılan)</option>
                        <option value="KDV Dahil">KDV Dahil Fiyatlar (Anlaşılan Toplam)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Başlangıç Tarihi *</label>
                      <input
                        type="date"
                        required
                        value={contractForm.startDate}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          const newEnd = calculateDefaultEndDateLocal(newStart);
                          setContractForm({ ...contractForm, startDate: newStart, endDate: newEnd });
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>
                        Bitiş Tarihi (Otomatik: 1 Yıl - 1 Gün) *
                      </label>
                      <input
                        type="date"
                        required
                        value={contractForm.endDate}
                        onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                </div>
              </details>

              {/* 👥 GRUP 2: İSG KADRO ATAMALARI & RESMİ KATİP KAYITLARI */}
              <details className="form-accordion-section">
                <summary>
                  <span>👥 2. İSG Kadro Atamaları & Katip Kayıtları</span>
                  <span className="accordion-status-badge">Aç / Kapat ▼</span>
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Atanan İSG Uzmanı</label>
                      <select
                        value={contractForm.assignedExpert}
                        onChange={(e) => setContractForm({ ...contractForm, assignedExpert: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                      >
                        <option value="">-- İSG Uzmanı Seçilmedi (Boş) --</option>
                        {CONTRACT_ISG_EXPERTS_LIST.map((exp) => (
                          <option key={exp.name} value={exp.name}>
                            {exp.name} ({exp.userType})
                          </option>
                        ))}
                        {contractForm.assignedExpert && !CONTRACT_ISG_EXPERTS_LIST.some((e) => e.name === contractForm.assignedExpert) && (
                          <option value={contractForm.assignedExpert}>{contractForm.assignedExpert}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Atanan İşyeri Hekimi</label>
                      <select
                        value={contractForm.assignedDoctor}
                        onChange={(e) => setContractForm({ ...contractForm, assignedDoctor: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                      >
                        <option value="">-- İşyeri Hekimi Seçilmedi (Boş) --</option>
                        {CONTRACT_WORKPLACE_DOCTORS_LIST.map((doc) => (
                          <option key={doc.name} value={doc.name}>
                            {doc.name} ({doc.userType})
                          </option>
                        ))}
                        {contractForm.assignedDoctor && !CONTRACT_WORKPLACE_DOCTORS_LIST.some((d) => d.name === contractForm.assignedDoctor) && (
                          <option value={contractForm.assignedDoctor}>{contractForm.assignedDoctor}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Atanan Diğer Sağlık Personeli (DSP)</label>
                      <select
                        value={contractForm.assignedDsp}
                        onChange={(e) => setContractForm({ ...contractForm, assignedDsp: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                      >
                        <option value="">-- DSP Seçilmedi --</option>
                        {CONTRACT_DSP_LIST.map((dsp) => (
                          <option key={dsp.name} value={dsp.name}>
                            {dsp.name} ({dsp.userType})
                          </option>
                        ))}
                        {contractForm.assignedDsp && !CONTRACT_DSP_LIST.some((d) => d.name === contractForm.assignedDsp) && (
                          <option value={contractForm.assignedDsp}>{contractForm.assignedDsp}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>İSG-Katip Sözleşme No</label>
                      <input
                        type="text"
                        placeholder="Örn: KTP-2026-98741"
                        value={contractForm.isgKatipNo}
                        onChange={(e) => setContractForm({ ...contractForm, isgKatipNo: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Sözleşme Kabul / Onay Kanalı</label>
                    <select
                      value={contractForm.acceptanceChannel}
                      onChange={(e) => setContractForm({ ...contractForm, acceptanceChannel: e.target.value as AcceptanceChannel })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                    >
                      <option value="Sözlü Onay (Telefon)">📞 Sözlü Onay (Telefon)</option>
                      <option value="WhatsApp">💬 WhatsApp</option>
                      <option value="E-posta">✉️ E-posta</option>
                      <option value="Sistem Üzerinden">💻 Sistem Üzerinden Online</option>
                      <option value="Fiziki / Yazılı Onay">📝 Fiziki / Yazılı Onay Formu</option>
                    </select>
                  </div>
                </div>
              </details>

              {/* 💳 GRUP 3: ÖDEME VADESİ & TİCARİ KOŞULLAR */}
              <details className="form-accordion-section">
                <summary>
                  <span>💳 3. Ödeme Vadesi & Ticari Koşullar</span>
                  <span className="accordion-status-badge">Aç / Kapat ▼</span>
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Ödeme Yöntemi</label>
                    <select
                      value={contractForm.paymentMethod}
                      onChange={(e) => setContractForm({ ...contractForm, paymentMethod: e.target.value as PaymentMethod })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                    >
                      <option value="Banka Havalesi / EFT">🏦 Banka Havalesi / EFT</option>
                      <option value="Kredi Kartı (Mail Order)">💳 Kredi Kartı (Mail Order)</option>
                      <option value="Çek / Senet">📄 Çek / Senet</option>
                      <option value="Nakit">💵 Nakit</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Ödeme Şekli / Vade</label>
                    <select
                      value={contractForm.paymentTerms}
                      onChange={(e) => setContractForm({ ...contractForm, paymentTerms: e.target.value as PaymentTerms })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                    >
                      <option value="Aylık Düzenli Fatura">Aylık Düzenli Fatura</option>
                      <option value="Peşin">Peşin (Tamamı)</option>
                      <option value="Peşinat + Taksit">Peşinat + Taksit</option>
                      <option value="30 Gün Vadeli">30 Gün Vadeli</option>
                      <option value="60 Gün Vadeli">60 Gün Vadeli</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Fatura Dönemi</label>
                    <select
                      value={contractForm.billingCycle}
                      onChange={(e) => setContractForm({ ...contractForm, billingCycle: e.target.value as any })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                    >
                      <option value="Aylık">Aylık</option>
                      <option value="3 Aylık">3 Aylık</option>
                      <option value="6 Aylık">6 Aylık</option>
                      <option value="Yıllık">Yıllık</option>
                    </select>
                  </div>
                </div>
              </details>

              {/* 💼 GRUP 4: HİZMET KALEMLERİ & FİYATLANDIRMA */}
              <details className="form-accordion-section" open>
                <summary>
                  <span>💼 4. Hizmet Kalemleri & Fiyatlandırma ({contractForm.services.length} Kalem)</span>
                  <span className="accordion-status-badge">Aç / Kapat ▼</span>
                </summary>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700 }}>
                      🔍 {customer.name} Filtreli Fiyat Listesi
                    </span>
                  </div>

                  {/* PRICE MATRIX SELECTOR */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <select
                      value={selectedPriceRuleId}
                      onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                      style={{ flex: '1 1 240px', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    >
                      <option value="">-- {customer.name || 'Firma'} İçin Matristen Kalem Seç --</option>
                      {getFilteredPriceRulesForCustomer(customer.name).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.service_name} ({r.danger_class} / {r.min_emp}-{r.max_emp || '∞'} Çalışan) - ₺{r.price}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddPriceRuleLine(customer.name, contractForm.services, (lines) => setContractForm({ ...contractForm, services: lines }))}
                      className="btn-secondary"
                      style={{ padding: '8px 14px', fontWeight: 700 }}
                    >
                      + Matristen Kalem Ekle
                    </button>
                  </div>

                  {/* CUSTOM LINE INPUT ROW */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Özel Hizmet Adı"
                      value={customLineInput.serviceName}
                      onChange={(e) => setCustomLineInput({ ...customLineInput, serviceName: e.target.value })}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                    />
                    <select
                      value={customLineInput.unit}
                      onChange={(e) => setCustomLineInput({ ...customLineInput, unit: e.target.value })}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>Birim: {u}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Miktar"
                      value={customLineInput.quantity || ''}
                      onChange={(e) => setCustomLineInput({ ...customLineInput, quantity: Number(e.target.value) })}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                    />
                    <input
                      type="number"
                      placeholder="Birim Fiyat (₺)"
                      value={customLineInput.unitPrice || ''}
                      onChange={(e) => setCustomLineInput({ ...customLineInput, unitPrice: Number(e.target.value) })}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                    />
                    <select
                      value={customLineInput.renewalPeriod}
                      onChange={(e) => setCustomLineInput({ ...customLineInput, renewalPeriod: e.target.value as RenewalPeriod })}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                    >
                      <option value="Yıllık">Periyot: Yıllık</option>
                      <option value="6 Aylık">Periyot: 6 Aylık</option>
                      <option value="3 Aylık">Periyot: 3 Aylık</option>
                      <option value="Aylık">Periyot: Aylık</option>
                      <option value="2 Yıllık">Periyot: 2 Yıllık</option>
                      <option value="Yok">Periyot: Yok</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddCustomLine(contractForm.services, (lines) => setContractForm({ ...contractForm, services: lines }))}
                      style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', padding: '6px 10px' }}
                    >
                      + Elle Kalem Ekle
                    </button>
                  </div>

                  {/* QUICK PERCENTAGE INCREASE HELPER BUTTONS */}
                  {contractForm.services.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>⚡ Tüm Kalemlere Zam Yap:</span>
                      <button type="button" onClick={() => handleApplyPercentageIncreaseToForm(10)} style={{ padding: '2px 8px', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>+%10</button>
                      <button type="button" onClick={() => handleApplyPercentageIncreaseToForm(20)} style={{ padding: '2px 8px', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>+%20</button>
                      <button type="button" onClick={() => handleApplyPercentageIncreaseToForm(30)} style={{ padding: '2px 8px', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>+%30</button>
                      <button type="button" onClick={() => handleApplyPercentageIncreaseToForm(50)} style={{ padding: '2px 8px', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>+%50</button>
                    </div>
                  )}

                  {/* SERVICES TABLE */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: 6, border: '1px solid var(--border)' }}>Hizmet Adı</th>
                        <th style={{ padding: 6, border: '1px solid var(--border)' }}>Miktar</th>
                        <th style={{ padding: 6, border: '1px solid var(--border)' }}>Birim Fiyat (₺)</th>
                        <th style={{ padding: 6, border: '1px solid var(--border)' }}>Toplam (₺)</th>
                        <th style={{ padding: 6, border: '1px solid var(--border)' }}>Yenileme Periyodu</th>
                        <th style={{ padding: 6, border: '1px solid var(--border)' }}>Sonraki Yenileme Tarihi</th>
                        <th style={{ padding: 6, border: '1px solid var(--border)', textAlign: 'right' }}>Sil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractForm.services.length > 0 ? (
                        contractForm.services.map((srv, index) => (
                          <tr key={srv.id || index}>
                            <td style={{ padding: 6, border: '1px solid var(--border)', fontWeight: 600 }}>{srv.serviceName}</td>
                            <td style={{ padding: 6, border: '1px solid var(--border)' }}>
                              <input
                                type="number"
                                value={srv.quantity}
                                onChange={(e) => {
                                  const newQty = Number(e.target.value);
                                  setContractForm((prev) => {
                                    const updated = [...prev.services];
                                    updated[index] = {
                                      ...updated[index],
                                      quantity: newQty,
                                      lineTotal: Math.round(newQty * (Number(updated[index].unitPrice) || 0))
                                    };
                                    return { ...prev, services: updated };
                                  });
                                }}
                                style={{ width: 60, padding: '2px 4px', fontSize: '0.8rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                              /> {srv.unit}
                            </td>
                            <td style={{ padding: 6, border: '1px solid var(--border)' }}>
                              <input
                                type="number"
                                value={srv.unitPrice}
                                onChange={(e) => {
                                  const newPrice = Number(e.target.value);
                                  setContractForm((prev) => {
                                    const updated = [...prev.services];
                                    updated[index] = {
                                      ...updated[index],
                                      unitPrice: newPrice,
                                      lineTotal: Math.round(newPrice * (Number(updated[index].quantity) || 1))
                                    };
                                    return { ...prev, services: updated };
                                  });
                                }}
                                style={{ width: 100, padding: '2px 4px', fontSize: '0.8rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontWeight: 700 }}
                              />
                              {activeContractForAction && (() => {
                                const revs = activeContractForAction.revisions || [];
                                const prevRev = revs.length > 1 ? revs[revs.length - 2] : null;
                                const prevLine = prevRev?.services?.find((ps) => ps.serviceName.trim().toLowerCase() === srv.serviceName.trim().toLowerCase());
                                if (prevLine && prevLine.unitPrice !== srv.unitPrice) {
                                  return (
                                    <span style={{ display: 'block', fontSize: '0.73rem', color: '#d97706', fontWeight: 600, marginTop: 2 }}>
                                      (Eski Fiyat: ₺{prevLine.unitPrice.toLocaleString('tr-TR')})
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </td>
                            <td style={{ padding: 6, border: '1px solid var(--border)', fontWeight: 700 }}>₺{(Number(srv.lineTotal) || 0).toLocaleString('tr-TR')}</td>
                            <td style={{ padding: 6, border: '1px solid var(--border)' }}>
                              <select
                                value={srv.renewalPeriod || 'Yıllık'}
                                onChange={(e) => {
                                  const updated = [...contractForm.services];
                                  updated[index].renewalPeriod = e.target.value as RenewalPeriod;
                                  setContractForm({ ...contractForm, services: updated });
                                }}
                                style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.78rem', fontWeight: 600 }}
                              >
                                <option value="Yıllık">Yıllık</option>
                                <option value="6 Aylık">6 Aylık</option>
                                <option value="3 Aylık">3 Aylık</option>
                                <option value="Aylık">Aylık</option>
                                <option value="2 Yıllık">2 Yıllık</option>
                                <option value="Yok">Yok</option>
                              </select>
                            </td>
                            <td style={{ padding: 6, border: '1px solid var(--border)' }}>
                              <input
                                type="date"
                                value={srv.nextRenewalDate || ''}
                                onChange={(e) => {
                                  const updated = [...contractForm.services];
                                  updated[index].nextRenewalDate = e.target.value;
                                  setContractForm({ ...contractForm, services: updated });
                                }}
                                style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.78rem' }}
                              />
                            </td>
                            <td style={{ padding: 6, border: '1px solid var(--border)', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setContractForm((prev) => ({
                                    ...prev,
                                    services: prev.services.filter((_, idx) => idx !== index)
                                  }));
                                }}
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 6px' }}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>Henüz hizmet kalemi eklenmedi.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {(() => {
                    const fin = computeContractFinancialsLocal(contractForm.services, contractForm.vatMode);
                    return (
                      <div style={{ marginTop: 14, background: 'var(--surface-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Matrah: </span>
                          <strong>₺{fin.subtotal.toLocaleString('tr-TR')}</strong>
                        </div>
                        <div style={{ fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>KDV (%20): </span>
                          <strong>₺{fin.taxAmount.toLocaleString('tr-TR')}</strong>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)' }}>
                          <span>GENEL TOPLAM ({contractForm.vatMode.toUpperCase()}): </span>
                          <span>₺{fin.grandTotal.toLocaleString('tr-TR')}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </details>

              {/* REVISION SAVE OPTION AT VERY BOTTOM */}
              {(editContractModalOpen || revisionModalOpen || renewContractModalOpen) && (
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#6366f1' }}>
                    <input
                      type="checkbox"
                      checked={contractForm.saveAsNewRevision}
                      onChange={(e) => setContractForm({ ...contractForm, saveAsNewRevision: e.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    🔄 Yapılan Değişiklikleri Yeni Revizyon / Ek Protokol Olarak Kaydet
                  </label>

                  {contractForm.saveAsNewRevision && (
                    <input
                      type="text"
                      placeholder="Revizyon / Ek Protokol Açıklaması (Örn: 2026 ÜFE Fiyat Artışı Ek Protokolü)"
                      value={contractForm.revisionNotes}
                      onChange={(e) => setContractForm({ ...contractForm, revisionNotes: e.target.value })}
                      style={{ padding: '8px 12px', fontSize: '0.86rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                    />
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-action-ghost"
                  onClick={() => {
                    setNewContractModalOpen(false);
                    setEditContractModalOpen(false);
                    setRevisionModalOpen(false);
                    setRenewContractModalOpen(false);
                  }}
                >
                  İptal
                </button>
                <button type="submit" className="btn-action-primary">
                  💾 {renewContractModalOpen ? 'Sözleşmeyi Yenile ve Kaydet' : 'Sözleşmeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CONTRACT HISTORY MODAL */}
      {historyModalOpen && activeContractForAction && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div className="modal-content" style={{ background: 'var(--surface-strong)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 16, width: '90%', maxWidth: 750, maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>🔄 Sözleşme Revizyon Geçmişi</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeContractForAction.contractNo} - {activeContractForAction.contractTitle}</span>
              </div>
              <button type="button" className="btn-action-ghost" onClick={() => setHistoryModalOpen(false)}>✕ Kapat</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(() => {
                const revisions = getRevisions(activeContractForAction);
                return revisions.map((rev, revIdx) => {
                  const prevRev = revIdx > 0 ? revisions[revIdx - 1] : null;
                  const b = getRevisionTypeBadge(rev);
                  return (
                    <details
                      key={rev.revisionNo}
                      open={revIdx === revisions.length - 1}
                      style={{
                        background: b.isBulk ? 'rgba(245, 158, 11, 0.05)' : 'var(--surface-subtle)',
                        border: b.isBulk ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 14
                      }}
                    >
                      <summary style={{ cursor: 'pointer', outline: 'none' }}>
                        <div style={{ display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center', width: '96%', flexWrap: 'wrap', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>Revizyon #{rev.revisionNo}</strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({rev.revisionDate})</span>
                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 800, background: b.bg, color: b.color, border: b.border || 'none' }}>
                              {b.label}
                            </span>
                          </div>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.98rem' }}>
                            ₺{(Number(rev.grandTotal) || 0).toLocaleString('tr-TR')} ({rev.vatMode || 'KDV Hariç'})
                          </strong>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: 'var(--text-main)', fontWeight: 600 }}>📝 {rev.revisionNotes}</p>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>👔 Hazırlayan / Motor: <strong>{rev.preparedBy}</strong></span>
                      </summary>

                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <ContractRevisionDiffView currentRev={rev} prevRev={prevRev} />
                      </div>
                    </details>
                  );
                });
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CONTRACT PDF PREVIEW MODAL */}
      <ContractPdfPreviewModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        contract={activeContractForAction}
      />
    </div>
  );
}

function CustomerOffersTab({
  customer,
  setCustomers
}: {
  customer: CustomerRecord;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRecord[]>>;
}) {
  const [offers, setOffers] = useState<OfferRecord[]>(() => {
    try {
      const stored = localStorage.getItem('crm_offers_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading offers', e);
    }
    return offerSeeds;
  });

  const [priceRules] = useState<PriceRule[]>(() => {
    try {
      const stored = localStorage.getItem('crm_price_list_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading price rules', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_offers_v3', JSON.stringify(offers));
    } catch (e) {
      console.error('Error saving offers', e);
    }
  }, [offers]);

  const customerOffers = useMemo(() => {
    return offers.filter((o) => o.customerName === customer.name);
  }, [offers, customer.name]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [activeOfferForAction, setActiveOfferForAction] = useState<OfferRecord | null>(null);

  // New Offer Form State (Requirement 1: Services starts empty [])
  const [newOfferForm, setNewOfferForm] = useState<{
    subject: string;
    owner: string;
    validUntilDate: string;
    vatMode: VatMode;
    services: OfferServiceLine[];
    overallDiscountType: 'percent' | 'amount';
    overallDiscountValue: number;
    notes: string;
  }>({
    subject: '',
    owner: customer.owner || 'Ayşe Yılmaz',
    validUntilDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vatMode: 'KDV Hariç',
    services: [],
    overallDiscountType: 'percent',
    overallDiscountValue: 0,
    notes: ''
  });

  // Edit Offer Form State (Requirement 4: Edit saved offer)
  const [editOfferForm, setEditOfferForm] = useState<{
    subject: string;
    owner: string;
    status: OfferRecord['status'];
    validUntilDate: string;
    vatMode: VatMode;
    services: OfferServiceLine[];
    overallDiscountType: 'percent' | 'amount';
    overallDiscountValue: number;
    notes: string;
  }>({
    subject: '',
    owner: 'Ayşe Yılmaz',
    status: 'Gönderildi',
    validUntilDate: '',
    vatMode: 'KDV Hariç',
    services: [],
    overallDiscountType: 'percent',
    overallDiscountValue: 0,
    notes: ''
  });

  // Revision Form State
  const [revisionForm, setRevisionForm] = useState<{
    preparedBy: string;
    revisionNotes: string;
    vatMode: VatMode;
    services: OfferServiceLine[];
    overallDiscountType: 'percent' | 'amount';
    overallDiscountValue: number;
  }>({
    preparedBy: customer.owner || 'Ayşe Yılmaz',
    revisionNotes: '',
    vatMode: 'KDV Hariç',
    services: [],
    overallDiscountType: 'percent',
    overallDiscountValue: 0
  });

  // Price List Dropdown Selector State inside Modals
  const [selectedPriceRuleId, setSelectedPriceRuleId] = useState<string>('');

  // Custom Line Manual Input State inside Modals
  const [customLineInput, setCustomLineInput] = useState<{
    serviceName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    kdvPercent: number;
  }>({
    serviceName: '',
    unit: 'Aylık',
    quantity: 1,
    unitPrice: 0,
    kdvPercent: 20
  });

  // Active Price Rules matching customer hazard class & employee count
  const matchingPriceRules = useMemo(() => {
    return priceRules.filter(
      (r) =>
        r.danger_class === customer.hazardClass &&
        customer.employeeCount >= r.min_emp &&
        (r.max_emp === null || customer.employeeCount <= r.max_emp)
    );
  }, [priceRules, customer.hazardClass, customer.employeeCount]);

  // Requirement 1: Open New Offer Modal with EMPTY services list
  const handleOpenCreateModal = () => {
    setNewOfferForm({
      subject: `${customer.name} - 2026 Hizmet Teklifi`,
      owner: customer.owner || 'Ayşe Yılmaz',
      validUntilDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      vatMode: 'KDV Hariç',
      services: [], // REQ 1: Kalemler boş başlayacak!
      overallDiscountType: 'percent',
      overallDiscountValue: 0,
      notes: ''
    });
    setSelectedPriceRuleId('');
    setCreateModalOpen(true);
  };

  // Requirement 4: Open Edit Modal for a saved offer
  const handleOpenEditOffer = (off: OfferRecord) => {
    setActiveOfferForAction(off);
    const activeRev = off.revisions[off.revisions.length - 1];
    setEditOfferForm({
      subject: off.subject,
      owner: off.owner,
      status: off.status,
      validUntilDate: off.validUntilDate,
      vatMode: activeRev?.vatMode || 'KDV Hariç',
      services: JSON.parse(JSON.stringify(activeRev ? activeRev.services : [])),
      overallDiscountType: activeRev?.overallDiscountType || 'percent',
      overallDiscountValue: activeRev?.overallDiscountValue || 0,
      notes: activeRev?.revisionNotes || ''
    });
    setSelectedPriceRuleId('');
    setEditModalOpen(true);
  };

  // Helper to add item from Price List Dropdown to any services list
  const handleAddPriceRuleLine = (
    currentServices: OfferServiceLine[],
    setServicesFn: (updated: OfferServiceLine[]) => void
  ) => {
    if (!selectedPriceRuleId) return;
    const rule = priceRules.find((r) => r.id === selectedPriceRuleId);
    if (!rule) return;

    const statutory = calculateIsgStatutoryHours(customer.employeeCount || 0, customer.hazardClass || 'Tehlikeli');
    let unit = 'Aylık';
    let qty = 1;
    const srv = rule.service_name;

    if (srv.includes('İSG Uzmanı') || srv.includes('Uzman')) {
      unit = 'Saat/Ay';
      qty = customer.expertMonthlyHours ? Number(customer.expertMonthlyHours) : statutory.expertHours;
    } else if (srv.includes('Hekim')) {
      unit = 'Saat/Ay';
      qty = customer.doctorMonthlyHours ? Number(customer.doctorMonthlyHours) : statutory.doctorHours;
    } else if (srv.includes('DSP') || srv.includes('Sağlık Personeli')) {
      unit = 'Aylık';
      qty = 1;
    }

    const lineTotal = Math.round(qty * Number(rule.price));
    const newLine: OfferServiceLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serviceName: rule.service_name,
      unit,
      quantity: qty,
      unitPrice: Number(rule.price),
      kdvPercent: 20,
      lineTotal
    };

    setServicesFn([...currentServices, newLine]);
    setSelectedPriceRuleId('');
  };

  // Helper to add custom manual item to any services list
  const handleAddCustomLine = (
    currentServices: OfferServiceLine[],
    setServicesFn: (updated: OfferServiceLine[]) => void
  ) => {
    if (!customLineInput.serviceName || !customLineInput.unitPrice) return;
    const lineTotal = Math.round(customLineInput.quantity * customLineInput.unitPrice);
    const newLine: OfferServiceLine = {
      id: `custom-${Date.now()}`,
      serviceName: customLineInput.serviceName,
      unit: customLineInput.unit,
      quantity: customLineInput.quantity,
      unitPrice: customLineInput.unitPrice,
      kdvPercent: customLineInput.kdvPercent,
      lineTotal
    };

    setServicesFn([...currentServices, newLine]);
    setCustomLineInput({ serviceName: '', unit: 'Aylık', quantity: 1, unitPrice: 0, kdvPercent: 20 });
  };

  // Save new offer
  const handleSaveNewOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferForm.subject) return;

    const offerNo = `TKL-2026-${String(offers.length + 1).padStart(3, '0')}`;
    const totals = computeOfferFinancials(
      newOfferForm.services,
      newOfferForm.overallDiscountType,
      newOfferForm.overallDiscountValue,
      newOfferForm.vatMode
    );

    const firstRevision: OfferRevision = {
      revisionNo: 0,
      revisionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      preparedBy: newOfferForm.owner,
      revisionNotes: newOfferForm.notes || 'İlk teklif oluşturuldu.',
      vatMode: newOfferForm.vatMode,
      services: newOfferForm.services,
      overallDiscountType: newOfferForm.overallDiscountType,
      overallDiscountValue: newOfferForm.overallDiscountValue,
      ...totals
    };

    const newRecord: OfferRecord = {
      id: `off-${Date.now()}`,
      offerNo,
      customerName: customer.name,
      subject: newOfferForm.subject,
      status: 'Gönderildi',
      currentRevisionNo: 0,
      createdDate: new Date().toISOString().split('T')[0],
      validUntilDate: newOfferForm.validUntilDate,
      owner: newOfferForm.owner,
      revisions: [firstRevision]
    };

    setOffers([newRecord, ...offers]);

    // Update customer.offers badge
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.name === customer.name) {
          const current = c.offers || [];
          if (!current.includes(offerNo)) {
            return { ...c, offers: [...current, offerNo] };
          }
        }
        return c;
      })
    );

    setCreateModalOpen(false);
  };

  // Save edited offer (Requirement 4)
  const handleSaveEditOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOfferForAction) return;

    const totals = computeOfferFinancials(
      editOfferForm.services,
      editOfferForm.overallDiscountType,
      editOfferForm.overallDiscountValue,
      editOfferForm.vatMode
    );

    setOffers((prev) =>
      prev.map((o) => {
        if (o.id === activeOfferForAction.id) {
          const updatedRevisions = [...o.revisions];
          const activeRevIndex = updatedRevisions.length - 1;

          if (activeRevIndex >= 0) {
            updatedRevisions[activeRevIndex] = {
              ...updatedRevisions[activeRevIndex],
              preparedBy: editOfferForm.owner,
              revisionNotes: editOfferForm.notes || updatedRevisions[activeRevIndex].revisionNotes,
              vatMode: editOfferForm.vatMode,
              services: editOfferForm.services,
              overallDiscountType: editOfferForm.overallDiscountType,
              overallDiscountValue: editOfferForm.overallDiscountValue,
              ...totals
            };
          }

          return {
            ...o,
            subject: editOfferForm.subject,
            owner: editOfferForm.owner,
            status: editOfferForm.status,
            validUntilDate: editOfferForm.validUntilDate,
            revisions: updatedRevisions
          };
        }
        return o;
      })
    );

    setEditModalOpen(false);
  };

  // Open revision modal
  const handleOpenCreateRevision = (off: OfferRecord) => {
    setActiveOfferForAction(off);
    const activeRev = off.revisions[off.revisions.length - 1];
    setRevisionForm({
      preparedBy: off.owner,
      revisionNotes: '',
      vatMode: activeRev?.vatMode || 'KDV Hariç',
      services: JSON.parse(JSON.stringify(activeRev ? activeRev.services : [])),
      overallDiscountType: activeRev?.overallDiscountType || 'percent',
      overallDiscountValue: activeRev?.overallDiscountValue || 0
    });
    setSelectedPriceRuleId('');
    setRevisionModalOpen(true);
  };

  // Save new revision
  const handleSaveNewRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOfferForAction) return;

    const activeRev = activeOfferForAction.revisions[activeOfferForAction.revisions.length - 1];
    const newRevNo = activeRev ? activeRev.revisionNo + 1 : 0;
    const totals = computeOfferFinancials(
      revisionForm.services,
      revisionForm.overallDiscountType,
      revisionForm.overallDiscountValue,
      revisionForm.vatMode
    );

    const newRevision: OfferRevision = {
      revisionNo: newRevNo,
      revisionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      preparedBy: revisionForm.preparedBy,
      revisionNotes: revisionForm.revisionNotes || `Revizyon ${newRevNo} kaydedildi.`,
      vatMode: revisionForm.vatMode,
      services: revisionForm.services,
      overallDiscountType: revisionForm.overallDiscountType,
      overallDiscountValue: revisionForm.overallDiscountValue,
      ...totals
    };

    setOffers((prev) =>
      prev.map((o) =>
        o.id === activeOfferForAction.id
          ? {
              ...o,
              currentRevisionNo: newRevNo,
              status: 'Revizyon İstendi',
              revisions: [...o.revisions, newRevision]
            }
          : o
      )
    );

    setRevisionModalOpen(false);
  };

  const handleUpdateStatus = (offerId: string, newStatus: OfferRecord['status']) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o))
    );
  };

  const kpiStats = useMemo(() => {
    let totalVal = 0;
    let wonVal = 0;
    let revCount = 0;

    customerOffers.forEach((o) => {
      const currentRev = o.revisions[o.revisions.length - 1];
      const val = currentRev ? currentRev.grandTotal : 0;
      totalVal += val;
      if (o.status === 'Kazanıldı') wonVal += val;
      if (o.revisions.length > 1) revCount++;
    });

    return {
      totalCount: customerOffers.length,
      totalValue: totalVal,
      wonValue: wonVal,
      revisedCount: revCount
    };
  }, [customerOffers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* HEADER & ACTION BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>
            📑 {customer.name} - Müşteri Teklifleri ({customerOffers.length})
          </h4>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Bu firmaya verilmiş tüm teklifler, fiyat dökümleri ve revizyon geçmişi
          </span>
        </div>

        <button
          type="button"
          className="btn-action-primary"
          onClick={handleOpenCreateModal}
          style={{ padding: '8px 18px', fontSize: '0.86rem' }}
        >
          + Bu Müşteriye Yeni Teklif Oluştur
        </button>
      </div>

      {/* KPI METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="panel panel-elevated" style={{ padding: '12px 16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Teklif Sayısı</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
            {kpiStats.totalCount} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Adet</span>
          </div>
        </div>

        <div className="panel panel-elevated" style={{ padding: '12px 16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Toplam Teklif Hacmi</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>
            ₺{kpiStats.totalValue.toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="panel panel-elevated" style={{ padding: '12px 16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Kazanılan Sözleşme Tutarı</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: 2 }}>
            ₺{kpiStats.wonValue.toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="panel panel-elevated" style={{ padding: '12px 16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Revizyon Görenler</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ec4899', marginTop: 2 }}>
            {kpiStats.revisedCount} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Teklif</span>
          </div>
        </div>
      </div>

      {/* OFFERS TABLE (REQUIREMENT 5: Derli toplu revizyonlu teklif görünümü) */}
      <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '10px 14px' }}>Teklif No</th>
              <th style={{ padding: '10px 14px' }}>Teklif Konusu / Başlığı</th>
              <th style={{ padding: '10px 14px' }}>Revizyon</th>
              <th style={{ padding: '10px 14px' }}>Toplam Tutar (KDV Dahil)</th>
              <th style={{ padding: '10px 14px' }}>Geçerlilik</th>
              <th style={{ padding: '10px 14px' }}>Durum</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {customerOffers.length > 0 ? (
              customerOffers.map((off) => {
                const currentRev = off.revisions[off.revisions.length - 1];
                const badge = OFFER_STATUS_BADGES[off.status] || OFFER_STATUS_BADGES['Taslak'];

                return (
                  <tr key={off.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent)' }}>
                      {off.offerNo}
                    </td>

                    <td style={{ padding: '10px 14px', color: 'var(--text-main)' }}>
                      <strong style={{ display: 'block', fontSize: '0.88rem' }}>{off.subject}</strong>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        👔 Sorumlu: {off.owner}
                      </span>
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <button
                        type="button"
                        className="mini-badge"
                        onClick={() => {
                          setActiveOfferForAction(off);
                          setHistoryModalOpen(true);
                        }}
                        style={{ cursor: 'pointer', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'none', fontWeight: 700 }}
                        title="Tüm Revizyon Geçmişini Gör"
                      >
                        🔄 Rev. {off.currentRevisionNo} ({off.revisions.length} Sürüm)
                      </button>
                    </td>

                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                      ₺{currentRev ? currentRev.grandTotal.toLocaleString('tr-TR') : 0}
                    </td>

                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      📅 {off.validUntilDate}
                    </td>

                    <td style={{ padding: '10px 14px' }}>
                      <select
                        value={off.status}
                        onChange={(e) => handleUpdateStatus(off.id, e.target.value as any)}
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: 20,
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Taslak">📝 Taslak</option>
                        <option value="Gönderildi">✉️ Gönderildi</option>
                        <option value="Revizyon İstendi">🔄 Revizyon İstendi</option>
                        <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
                        <option value="Kazanıldı">🏆 Kazanıldı</option>
                        <option value="Kaybedildi">✕ Kaybedildi</option>
                      </select>
                    </td>

                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* REQ 4: Kaydedilmiş teklifi düzenleme butonu */}
                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                          onClick={() => handleOpenEditOffer(off)}
                          title="Teklifi Düzenle"
                        >
                          ✏️ Düzenle
                        </button>

                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                          onClick={() => handleOpenCreateRevision(off)}
                          title="Yeni Revizyon Oluştur"
                        >
                          🔄 Revizyon Yap
                        </button>

                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                          onClick={() => {
                            setActiveOfferForAction(off);
                            setPreviewModalOpen(true);
                          }}
                          title="Resmi Teklif Mektubu Önizle"
                        >
                          🖨️ Önizle
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Bu müşteri için henüz teklif oluşturulmamış. Yukarıdaki '+ Bu Müşteriye Yeni Teklif Oluştur' butonuna tıklayarak teklif ekleyebilirsiniz.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: CREATE OFFER (REQUIREMENT 1, 2, 3) */}
      {createModalOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto'
            }}
            onClick={() => setCreateModalOpen(false)}
          >
            <div
              style={{
                maxWidth: 880, width: '100%',
                background: 'var(--surface-strong)',
                border: '1px solid var(--border-strong)',
                borderRadius: '20px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                padding: '28px 32px',
                display: 'flex', flexDirection: 'column', gap: 20
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>📑 {customer.name} - Yeni Teklif</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Fiyat listesindeki kalemlerden seçin veya el ile özel kalem ekleyin.
                  </span>
                </div>
                <button type="button" className="btn-action-ghost" onClick={() => setCreateModalOpen(false)}>✕ Kapat</button>
              </div>

              <form onSubmit={handleSaveNewOffer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 📌 GRUP 1: TEMEL TEKLİF & GEÇERLİLİK BİLGİLERİ */}
                <details className="form-accordion-section-offer">
                  <summary>
                    <span>📌 1. Temel Teklif & Geçerlilik Bilgileri</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <label className="select-field">
                      <span>Müşteri Unvanı</span>
                      <input type="text" readOnly value={customer.name} style={{ background: 'var(--surface-subtle)', fontWeight: 700 }} />
                    </label>

                    <label className="select-field" style={{ gridColumn: '1 / -1' }}>
                      <span>Teklif Konusu / Başlığı *</span>
                      <input
                        type="text"
                        required
                        placeholder="Örn: 2026 Yıllık İSG, İşyeri Hekimi ve Sağlık Taramaları Hizmet Teklifi"
                        value={newOfferForm.subject}
                        onChange={(e) => setNewOfferForm({ ...newOfferForm, subject: e.target.value })}
                      />
                    </label>

                    <label className="select-field">
                      <span>Hazırlayan / Sorumlu</span>
                      <select
                        value={newOfferForm.owner}
                        onChange={(e) => setNewOfferForm({ ...newOfferForm, owner: e.target.value })}
                      >
                        <option value="Ayşe Yılmaz">👔 Ayşe Yılmaz (Portföy Yöneticisi)</option>
                        <option value="Mehmet Demir">👔 Mehmet Demir (Müşteri Temsilcisi)</option>
                        <option value="Zeynep Kaya">👔 Zeynep Kaya (Saha Satış Sorumlusu)</option>
                        <option value="Caner Şahin">👔 Caner Şahin (İSG Uzmanı)</option>
                        <option value="Dr. Ali Yılmaz">👔 Dr. Ali Yılmaz (İşyeri Hekimi)</option>
                        <option value="Dr. Ayşe Kara">👔 Dr. Ayşe Kara (İşyeri Hekimi)</option>
                        <option value="Uzman Ahmet Yıldız">👔 Uzman Ahmet Yıldız (A Sınıfı İSG Uzmanı)</option>
                        <option value="Uzman Elif Şahin">👔 Uzman Elif Şahin (B Sınıfı İSG Uzmanı)</option>
                        <option value="Selim Can">👔 Selim Can (Operasyon Müdürü)</option>
                        {newOfferForm.owner && !['Ayşe Yılmaz','Mehmet Demir','Zeynep Kaya','Caner Şahin','Dr. Ali Yılmaz','Dr. Ayşe Kara','Uzman Ahmet Yıldız','Uzman Elif Şahin','Selim Can'].includes(newOfferForm.owner) && (
                          <option value={newOfferForm.owner}>👔 {newOfferForm.owner}</option>
                        )}
                      </select>
                    </label>

                    <label className="select-field">
                      <span>Son Geçerlilik Tarihi</span>
                      <input
                        type="date"
                        value={newOfferForm.validUntilDate}
                        onChange={(e) => setNewOfferForm({ ...newOfferForm, validUntilDate: e.target.value })}
                      />
                    </label>
                  </div>
                </details>

                {/* 🏢 GRUP 2: FİRMA TEŞHİS & İSG HİZMET PARAMETRELERİ */}
                <details className="form-accordion-section-offer">
                  <summary>
                    <span>🏢 2. Firma Teşhis & İSG Hizmet Parametreleri</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  {(() => {
                    const stat = calculateIsgStatutoryHours(customer.employeeCount || 0, customer.hazardClass || 'Tehlikeli');
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Tehlike Sınıfı</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{customer.hazardClass}</strong>
                        </div>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Çalışan Sayısı</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{customer.employeeCount} Kişi</strong>
                        </div>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Yasal İSG Uzmanı Süresi</span>
                          <strong style={{ fontSize: '0.9rem', color: '#0d9488' }}>{stat.expertHours} Saat/Ay</strong>
                        </div>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Yasal İşyeri Hekimi Süresi</span>
                          <strong style={{ fontSize: '0.9rem', color: '#0d9488' }}>{stat.doctorHours} Saat/Ay</strong>
                        </div>
                      </div>
                    );
                  })()}
                </details>

                {/* 💼 GRUP 3: TEKLİF KALEMLERİ & FİYATLANDIRMA */}
                <details className="form-accordion-section-offer">
                  <summary>
                    <span>💼 3. Teklif Kalemleri & Fiyatlandırma ({newOfferForm.services.length} Kalem)</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <div>
                    {/* FİYATLANDIRMA TİPİ (KDV DURUMU) - BÖLÜM 3 */}
                    <div style={{ background: 'var(--surface-subtle)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
                      <label className="select-field" style={{ margin: 0 }}>
                        <span>Fiyatlandırma Tipi (KDV Durumu) *</span>
                        <select
                          value={newOfferForm.vatMode}
                          onChange={(e) => setNewOfferForm({ ...newOfferForm, vatMode: e.target.value as VatMode })}
                          style={{ fontWeight: 700 }}
                        >
                          <option value="KDV Hariç">KDV Hariç Fiyatlar (Varsayılan)</option>
                          <option value="KDV Dahil">KDV Dahil Fiyatlar (Anlaşılan Toplam)</option>
                        </select>
                      </label>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        📋 Seçilen Hizmet Kalemleri
                      </strong>
                    </div>

                    <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '8px 12px' }}>Hizmet / Kalem Adı</th>
                            <th style={{ padding: '8px 12px' }}>Birim</th>
                            <th style={{ padding: '8px 12px', width: 90 }}>Miktar</th>
                            <th style={{ padding: '8px 12px', width: 110 }}>Birim Fiyat (₺)</th>
                            <th style={{ padding: '8px 12px', width: 90 }}>KDV (%)</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {newOfferForm.vatMode === 'KDV Dahil' ? 'Tutar (KDV Dahil ₺)' : 'Tutar Net (KDV Hariç ₺)'}
                            </th>
                            <th style={{ padding: '8px 12px', width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {newOfferForm.services.length > 0 ? (
                            newOfferForm.services.map((line, idx) => (
                              <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '6px 12px' }}>
                                  <input
                                    type="text"
                                    value={line.serviceName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNewOfferForm((prev) => {
                                        const updated = [...prev.services];
                                        updated[idx].serviceName = val;
                                        return { ...prev, services: updated };
                                      });
                                    }}
                                    style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                                  />
                                </td>

                                <td style={{ padding: '6px 12px' }}>
                                  <select
                                    value={line.unit}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNewOfferForm((prev) => {
                                        const updated = [...prev.services];
                                        updated[idx].unit = val;
                                        return { ...prev, services: updated };
                                      });
                                    }}
                                    style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                                  >
                                    <option value="Saat/Ay">Saat/Ay</option>
                                    <option value="Aylık">Aylık</option>
                                    <option value="Kişi/Ay">Kişi/Ay</option>
                                    <option value="Adet">Adet</option>
                                    <option value="Paket">Paket</option>
                                  </select>
                                </td>

                                <td style={{ padding: '6px 12px' }}>
                                  <input
                                    type="number"
                                    min={1}
                                    value={line.quantity}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setNewOfferForm((prev) => {
                                        const updated = [...prev.services];
                                        updated[idx].quantity = val;
                                        updated[idx].lineTotal = Math.round(val * updated[idx].unitPrice);
                                        return { ...prev, services: updated };
                                      });
                                    }}
                                    style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                                  />
                                </td>

                                <td style={{ padding: '6px 12px' }}>
                                  <input
                                    type="number"
                                    min={0}
                                    value={line.unitPrice}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setNewOfferForm((prev) => {
                                        const updated = [...prev.services];
                                        updated[idx].unitPrice = val;
                                        updated[idx].lineTotal = Math.round(updated[idx].quantity * val);
                                        return { ...prev, services: updated };
                                      });
                                    }}
                                    style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--accent)', fontWeight: 700 }}
                                  />
                                </td>

                                <td style={{ padding: '6px 12px' }}>
                                  <select
                                    value={line.kdvPercent}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setNewOfferForm((prev) => {
                                        const updated = [...prev.services];
                                        updated[idx].kdvPercent = val;
                                        return { ...prev, services: updated };
                                      });
                                    }}
                                    style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 600 }}
                                  >
                                    <option value={20}>%20</option>
                                    <option value={10}>%10</option>
                                    <option value={0}>%0 (Muaf)</option>
                                  </select>
                                </td>

                                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)' }}>
                                  ₺{(line.quantity * line.unitPrice).toLocaleString('tr-TR')}
                                </td>

                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                                    onClick={() => {
                                      setNewOfferForm((prev) => ({
                                        ...prev,
                                        services: prev.services.filter((_, i) => i !== idx)
                                      }));
                                    }}
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Henüz teklif kalemi eklenmedi. Aşağıdaki panellerden fiyat listesinden veya el ile kalem ekleyin.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* ADD ITEM DROPDOWN OR CUSTOM */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-subtle)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d9488' }}>🏷️ Fiyat Listesinden Hizmet Seçin:</span>
                        <select
                          value={selectedPriceRuleId}
                          onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                          style={{ flex: 1, minWidth: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                        >
                          <option value="">-- Fiyat Listesindeki Hizmetler ({matchingPriceRules.length}) --</option>
                          {matchingPriceRules.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.service_name} — ₺{rule.price.toLocaleString('tr-TR')} ({rule.danger_class} / {rule.min_emp}-{rule.max_emp || '∞'} Personel)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-action-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#0d9488' }}
                          onClick={() => handleAddPriceRuleLine(newOfferForm.services, (services) => setNewOfferForm((prev) => ({ ...prev, services })))}
                        >
                          + Listeden Ekle
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 10, border: '1px dashed var(--border)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>✍️ El İle Özel Kalem Girin:</span>
                        <input
                          type="text"
                          placeholder="Kalem adı"
                          value={customLineInput.serviceName}
                          onChange={(e) => setCustomLineInput({ ...customLineInput, serviceName: e.target.value })}
                          style={{ flex: 1, minWidth: 160, padding: '5px 10px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        />
                        <input
                          type="number"
                          placeholder="Miktar"
                          min={1}
                          value={customLineInput.quantity}
                          onChange={(e) => setCustomLineInput({ ...customLineInput, quantity: Number(e.target.value) })}
                          style={{ width: 70, padding: '5px 8px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        />
                        <input
                          type="number"
                          placeholder="Birim Fiyat (₺)"
                          min={0}
                          value={customLineInput.unitPrice || ''}
                          onChange={(e) => setCustomLineInput({ ...customLineInput, unitPrice: Number(e.target.value) })}
                          style={{ width: 110, padding: '5px 8px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--accent)', fontWeight: 700 }}
                        />
                        <select
                          value={customLineInput.kdvPercent}
                          onChange={(e) => setCustomLineInput({ ...customLineInput, kdvPercent: Number(e.target.value) })}
                          style={{ padding: '5px 8px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          <option value={20}>KDV %20</option>
                          <option value={10}>KDV %10</option>
                          <option value={0}>KDV %0</option>
                        </select>
                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleAddCustomLine(newOfferForm.services, (services) => setNewOfferForm((prev) => ({ ...prev, services })))}
                        >
                          + El İle Ekle
                        </button>
                      </div>
                    </div>

                    {/* OVERALL DISCOUNT & FINANCIAL SUMMARY */}
                    {(() => {
                      const isVatInclusive = newOfferForm.vatMode === 'KDV Dahil';
                      const totals = computeOfferFinancials(
                        newOfferForm.services,
                        newOfferForm.overallDiscountType,
                        newOfferForm.overallDiscountValue,
                        newOfferForm.vatMode
                      );

                      return (
                        <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: '14px 18px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>💰 Genel İskonto Uygula</strong>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select
                                value={newOfferForm.overallDiscountType}
                                onChange={(e) => setNewOfferForm({ ...newOfferForm, overallDiscountType: e.target.value as any })}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 600 }}
                              >
                                <option value="percent">% Yüzde İskonto</option>
                                <option value="amount">₺ Tutar İskonto</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                value={newOfferForm.overallDiscountValue || ''}
                                onChange={(e) => setNewOfferForm({ ...newOfferForm, overallDiscountValue: Number(e.target.value) })}
                                style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: '#ef4444', fontWeight: 700, fontSize: '0.88rem' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {isVatInclusive ? (
                                <>
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Matrah (KDV Hariç): <strong>₺{totals.subtotal.toLocaleString('tr-TR')}</strong></span>
                                  {totals.discountTotal > 0 && <span style={{ fontSize: '0.84rem', color: '#ef4444' }}>Uygulanan İskonto: <strong>-₺{totals.discountTotal.toLocaleString('tr-TR')}</strong></span>}
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>İç KDV Tutarı (%20): <strong>₺{totals.taxAmount.toLocaleString('tr-TR')}</strong></span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Ara Toplam (Matrah): <strong>₺{totals.subtotal.toLocaleString('tr-TR')}</strong></span>
                                  {totals.discountTotal > 0 && <span style={{ fontSize: '0.84rem', color: '#ef4444' }}>Uygulanan İskonto: <strong>-₺{totals.discountTotal.toLocaleString('tr-TR')}</strong></span>}
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>KDV Toplamı: <strong>₺{totals.taxAmount.toLocaleString('tr-TR')}</strong></span>
                                </>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>TEKLİF GENEL TOPLAMI (KDV DAHİL)</span>
                              <span style={{ fontSize: '1.45rem', color: '#0d9488', fontWeight: 800 }}>₺{totals.grandTotal.toLocaleString('tr-TR')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </details>

                {/* 📝 GRUP 4: TEKLİF NOTLARI & ÖZEL ŞARTLAR */}
                <details className="form-accordion-section-offer">
                  <summary>
                    <span>📝 4. Teklif Notları & Özel Şartlar</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <label className="select-field">
                    <span>Teklif Notları & Şartlar</span>
                    <textarea
                      rows={3}
                      placeholder="Teklif geçerlilik şartları, ödeme koşulları veya özel notlar..."
                      value={newOfferForm.notes}
                      onChange={(e) => setNewOfferForm({ ...newOfferForm, notes: e.target.value })}
                    />
                  </label>
                </details>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                  <button type="button" className="btn-action-ghost" onClick={() => setCreateModalOpen(false)}>İptal</button>
                  <button type="submit" className="btn-action-primary" style={{ padding: '10px 24px', background: '#0d9488' }}>+ Teklifi Oluştur ve Kaydet</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 2: EDIT EXISTING OFFER (REQUIREMENT 4) */}
      {editModalOpen && activeOfferForAction &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto'
            }}
            onClick={() => setEditModalOpen(false)}
          >
            <div
              style={{
                maxWidth: 880, width: '100%',
                background: 'var(--surface-strong)',
                border: '1px solid var(--border-strong)',
                borderRadius: '20px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                padding: '28px 32px',
                display: 'flex', flexDirection: 'column', gap: 20
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                    ✏️ Teklifi Düzenle ({activeOfferForAction.offerNo})
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Mevcut teklif kaydı üzerindeki bilgileri, kalemleri ve fiyatları direkt güncelleyin.
                  </span>
                </div>
                <button type="button" className="btn-action-ghost" onClick={() => setEditModalOpen(false)}>✕ Kapat</button>
              </div>

              <form onSubmit={handleSaveEditOffer} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 📌 GRUP 1: TEMEL TEKLİF & GEÇERLİLİK BİLGİLERİ */}
                <details className="form-accordion-section-offer">
                  <summary>
                    <span>📌 1. Temel Teklif & Geçerlilik Bilgileri</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    <label className="select-field">
                      <span>Müşteri Unvanı</span>
                      <input type="text" readOnly value={activeOfferForAction.customerName} style={{ background: 'var(--surface-subtle)', fontWeight: 700 }} />
                    </label>

                    <label className="select-field" style={{ gridColumn: '1 / -1' }}>
                      <span>Teklif Konusu / Başlığı *</span>
                      <input
                        type="text"
                        required
                        value={editOfferForm.subject}
                        onChange={(e) => setEditOfferForm({ ...editOfferForm, subject: e.target.value })}
                      />
                    </label>

                    <label className="select-field">
                      <span>Hazırlayan / Sorumlu</span>
                      <select
                        value={editOfferForm.owner}
                        onChange={(e) => setEditOfferForm({ ...editOfferForm, owner: e.target.value })}
                      >
                        <option value="Ayşe Yılmaz">👔 Ayşe Yılmaz (Portföy Yöneticisi)</option>
                        <option value="Mehmet Demir">👔 Mehmet Demir (Müşteri Temsilcisi)</option>
                        <option value="Zeynep Kaya">👔 Zeynep Kaya (Saha Satış Sorumlusu)</option>
                        <option value="Caner Şahin">👔 Caner Şahin (İSG Uzmanı)</option>
                        <option value="Dr. Ali Yılmaz">👔 Dr. Ali Yılmaz (İşyeri Hekimi)</option>
                        <option value="Dr. Ayşe Kara">👔 Dr. Ayşe Kara (İşyeri Hekimi)</option>
                        <option value="Uzman Ahmet Yıldız">👔 Uzman Ahmet Yıldız (A Sınıfı İSG Uzmanı)</option>
                        <option value="Uzman Elif Şahin">👔 Uzman Elif Şahin (B Sınıfı İSG Uzmanı)</option>
                        <option value="Selim Can">👔 Selim Can (Operasyon Müdürü)</option>
                        {editOfferForm.owner && !['Ayşe Yılmaz','Mehmet Demir','Zeynep Kaya','Caner Şahin','Dr. Ali Yılmaz','Dr. Ayşe Kara','Uzman Ahmet Yıldız','Uzman Elif Şahin','Selim Can'].includes(editOfferForm.owner) && (
                          <option value={editOfferForm.owner}>👔 {editOfferForm.owner}</option>
                        )}
                      </select>
                    </label>

                    <label className="select-field">
                      <span>Teklif Durumu</span>
                      <select
                        value={editOfferForm.status}
                        onChange={(e) => setEditOfferForm({ ...editOfferForm, status: e.target.value as any })}
                      >
                        <option value="Taslak">📝 Taslak</option>
                        <option value="Gönderildi">✉️ Gönderildi</option>
                        <option value="Revizyon İstendi">🔄 Revizyon İstendi</option>
                        <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
                        <option value="Kazanıldı">🏆 Kazanıldı</option>
                        <option value="Kaybedildi">✕ Kaybedildi</option>
                      </select>
                    </label>

                    <label className="select-field">
                      <span>Son Geçerlilik Tarihi</span>
                      <input
                        type="date"
                        value={editOfferForm.validUntilDate}
                        onChange={(e) => setEditOfferForm({ ...editOfferForm, validUntilDate: e.target.value })}
                      />
                    </label>
                  </div>
                </details>

                {/* 🏢 GRUP 2: FİRMA TEŞHİS & İSG HİZMET PARAMETRELERİ */}
                <details className="form-accordion-section-offer">
                  <summary>
                    <span>🏢 2. Firma Teşhis & İSG Hizmet Parametreleri</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  {(() => {
                    const stat = calculateIsgStatutoryHours(customer.employeeCount || 0, customer.hazardClass || 'Tehlikeli');
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Tehlike Sınıfı</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{customer.hazardClass}</strong>
                        </div>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Çalışan Sayısı</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{customer.employeeCount} Kişi</strong>
                        </div>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Yasal İSG Uzmanı Süresi</span>
                          <strong style={{ fontSize: '0.9rem', color: '#0d9488' }}>{stat.expertHours} Saat/Ay</strong>
                        </div>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Yasal İşyeri Hekimi Süresi</span>
                          <strong style={{ fontSize: '0.9rem', color: '#0d9488' }}>{stat.doctorHours} Saat/Ay</strong>
                        </div>
                      </div>
                    );
                  })()}
                </details>

                {/* 💼 GRUP 3: TEKLİF KALEMLERİ & FİYATLANDIRMA */}
                <details className="form-accordion-section-offer">
                  <summary>
                    <span>💼 3. Teklif Kalemleri & Fiyatlandırma ({editOfferForm.services.length} Kalem)</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <div>
                    {/* FİYATLANDIRMA TİPİ (KDV DURUMU) - BÖLÜM 3 */}
                    <div style={{ background: 'var(--surface-subtle)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
                      <label className="select-field" style={{ margin: 0 }}>
                        <span>Fiyatlandırma Tipi (KDV Durumu) *</span>
                        <select
                          value={editOfferForm.vatMode}
                          onChange={(e) => setEditOfferForm({ ...editOfferForm, vatMode: e.target.value as VatMode })}
                          style={{ fontWeight: 700 }}
                        >
                          <option value="KDV Hariç">KDV Hariç Fiyatlar (Varsayılan)</option>
                          <option value="KDV Dahil">KDV Dahil Fiyatlar (Anlaşılan Toplam)</option>
                        </select>
                      </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        📋 Teklif Kalemleri ve Birim Fiyatlar
                      </strong>
                    </div>

                    <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '8px 12px' }}>Hizmet / Kalem Adı</th>
                            <th style={{ padding: '8px 12px' }}>Birim</th>
                            <th style={{ padding: '8px 12px', width: 90 }}>Miktar</th>
                            <th style={{ padding: '8px 12px', width: 110 }}>Birim Fiyat (₺)</th>
                            <th style={{ padding: '8px 12px', width: 90 }}>KDV (%)</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>
                              {editOfferForm.vatMode === 'KDV Dahil' ? 'Tutar (KDV Dahil ₺)' : 'Tutar Net (KDV Hariç ₺)'}
                            </th>
                            <th style={{ padding: '8px 12px', width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editOfferForm.services.map((line, idx) => (
                            <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px 12px' }}>
                                <input
                                  type="text"
                                  value={line.serviceName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditOfferForm((prev) => {
                                      const updated = [...prev.services];
                                      updated[idx].serviceName = val;
                                      return { ...prev, services: updated };
                                    });
                                  }}
                                  style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                                />
                              </td>

                              <td style={{ padding: '6px 12px' }}>
                                <input
                                  type="text"
                                  value={line.unit}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditOfferForm((prev) => {
                                      const updated = [...prev.services];
                                      updated[idx].unit = val;
                                      return { ...prev, services: updated };
                                    });
                                  }}
                                  style={{ width: 80, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                                />
                              </td>

                              <td style={{ padding: '6px 12px' }}>
                                <input
                                  type="number"
                                  min={1}
                                  value={line.quantity}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setEditOfferForm((prev) => {
                                      const updated = [...prev.services];
                                      updated[idx].quantity = val;
                                      updated[idx].lineTotal = Math.round(val * updated[idx].unitPrice);
                                      return { ...prev, services: updated };
                                    });
                                  }}
                                  style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                                />
                              </td>

                              <td style={{ padding: '6px 12px' }}>
                                <input
                                  type="number"
                                  min={0}
                                  value={line.unitPrice}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setEditOfferForm((prev) => {
                                      const updated = [...prev.services];
                                      updated[idx].unitPrice = val;
                                      updated[idx].lineTotal = Math.round(updated[idx].quantity * val);
                                      return { ...prev, services: updated };
                                    });
                                  }}
                                  style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--accent)', fontWeight: 700 }}
                                />
                              </td>

                              <td style={{ padding: '6px 12px' }}>
                                <select
                                  value={line.kdvPercent}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setEditOfferForm((prev) => {
                                      const updated = [...prev.services];
                                      updated[idx].kdvPercent = val;
                                      return { ...prev, services: updated };
                                    });
                                  }}
                                  style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 600 }}
                                >
                                  <option value={20}>%20</option>
                                  <option value={10}>%10</option>
                                  <option value={0}>%0</option>
                                </select>
                              </td>

                              <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)' }}>
                                ₺{(line.quantity * line.unitPrice).toLocaleString('tr-TR')}
                              </td>

                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                                  onClick={() => {
                                    setEditOfferForm((prev) => ({
                                      ...prev,
                                      services: prev.services.filter((_, i) => i !== idx)
                                    }));
                                  }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ADD ITEM DROPDOWN OR CUSTOM */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-subtle)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0d9488' }}>🏷️ Fiyat Listesinden Hizmet Seçin:</span>
                        <select
                          value={selectedPriceRuleId}
                          onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                          style={{ flex: 1, minWidth: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                        >
                          <option value="">-- Fiyat Listesindeki Hizmetler ({matchingPriceRules.length}) --</option>
                          {matchingPriceRules.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.service_name} — ₺{rule.price.toLocaleString('tr-TR')} ({rule.danger_class})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-action-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#0d9488' }}
                          onClick={() => handleAddPriceRuleLine(editOfferForm.services, (services) => setEditOfferForm((prev) => ({ ...prev, services })))}
                        >
                          + Listeden Ekle
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 10, border: '1px dashed var(--border)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>✍️ El İle Özel Kalem Girin:</span>
                        <input
                          type="text"
                          placeholder="Kalem adı"
                          value={customLineInput.serviceName}
                          onChange={(e) => setCustomLineInput({ ...customLineInput, serviceName: e.target.value })}
                          style={{ flex: 1, minWidth: 160, padding: '5px 10px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        />
                        <input
                          type="number"
                          placeholder="Miktar"
                          min={1}
                          value={customLineInput.quantity}
                          onChange={(e) => setCustomLineInput({ ...customLineInput, quantity: Number(e.target.value) })}
                          style={{ width: 70, padding: '5px 8px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        />
                        <input
                          type="number"
                          placeholder="Birim Fiyat (₺)"
                          min={0}
                          value={customLineInput.unitPrice || ''}
                          onChange={(e) => setCustomLineInput({ ...customLineInput, unitPrice: Number(e.target.value) })}
                          style={{ width: 110, padding: '5px 8px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--accent)', fontWeight: 700 }}
                        />
                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleAddCustomLine(editOfferForm.services, (services) => setEditOfferForm((prev) => ({ ...prev, services })))}
                        >
                          + El İle Ekle
                        </button>
                      </div>
                    </div>

                    {/* OVERALL DISCOUNT & TOTALS */}
                    {(() => {
                      const isVatInclusive = editOfferForm.vatMode === 'KDV Dahil';
                      const totals = computeOfferFinancials(
                        editOfferForm.services,
                        editOfferForm.overallDiscountType,
                        editOfferForm.overallDiscountValue,
                        editOfferForm.vatMode
                      );

                      return (
                        <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: '14px 18px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>💰 Genel İskonto Düzenle</strong>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <select
                                value={editOfferForm.overallDiscountType}
                                onChange={(e) => setEditOfferForm({ ...editOfferForm, overallDiscountType: e.target.value as any })}
                                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 600 }}
                              >
                                <option value="percent">% Yüzde İskonto</option>
                                <option value="amount">₺ Tutar İskonto</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                value={editOfferForm.overallDiscountValue || ''}
                                onChange={(e) => setEditOfferForm({ ...editOfferForm, overallDiscountValue: Number(e.target.value) })}
                                style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: '#ef4444', fontWeight: 700, fontSize: '0.88rem' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {isVatInclusive ? (
                                <>
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Matrah (KDV Hariç): <strong>₺{totals.subtotal.toLocaleString('tr-TR')}</strong></span>
                                  {totals.discountTotal > 0 && <span style={{ fontSize: '0.84rem', color: '#ef4444' }}>Uygulanan Genel İskonto: <strong>-₺{totals.discountTotal.toLocaleString('tr-TR')}</strong></span>}
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>İç KDV Tutarı (%20): <strong>₺{totals.taxAmount.toLocaleString('tr-TR')}</strong></span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Ara Toplam (KDV Hariç): <strong>₺{totals.subtotal.toLocaleString('tr-TR')}</strong></span>
                                  {totals.discountTotal > 0 && <span style={{ fontSize: '0.84rem', color: '#ef4444' }}>Uygulanan Genel İskonto: <strong>-₺{totals.discountTotal.toLocaleString('tr-TR')}</strong></span>}
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Hesaplanan KDV Toplamı: <strong>₺{totals.taxAmount.toLocaleString('tr-TR')}</strong></span>
                                </>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>GÜNCELLENMİŞ TEKLİF TUTARI (KDV DAHİL)</span>
                              <span style={{ fontSize: '1.45rem', color: '#0d9488', fontWeight: 800 }}>₺{totals.grandTotal.toLocaleString('tr-TR')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </details>

                {/* 📝 GRUP 4: TEKLİF NOTLARI & ŞARTLAR */}
                <details className="form-accordion-section-offer">
                  <summary>
                    <span>📝 4. Teklif Notları & Özel Şartlar</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <label className="select-field">
                    <span>Teklif Notları & Açıklama</span>
                    <textarea
                      rows={3}
                      value={editOfferForm.notes}
                      onChange={(e) => setEditOfferForm({ ...editOfferForm, notes: e.target.value })}
                    />
                  </label>
                </details>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                  <button type="button" className="btn-action-ghost" onClick={() => setEditModalOpen(false)}>İptal</button>
                  <button type="submit" className="btn-action-primary" style={{ padding: '10px 24px', background: '#0d9488' }}>💾 Değişiklikleri Kaydet</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 3: CREATE REVISION */}
      {revisionModalOpen && activeOfferForAction &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto'
            }}
            onClick={() => setRevisionModalOpen(false)}
          >
            <div
              style={{
                maxWidth: 880, width: '100%',
                background: 'var(--surface-strong)',
                border: '1px solid var(--border-strong)',
                borderRadius: '20px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                padding: '28px 32px',
                display: 'flex', flexDirection: 'column', gap: 20
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                    🔄 Teklife Yeni Revizyon Ekle ({activeOfferForAction.offerNo})
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Mevcut revizyon (Rev. {activeOfferForAction.currentRevisionNo}) güncellenerek <strong>Rev. {activeOfferForAction.currentRevisionNo + 1}</strong> olarak kaydedilecek.
                  </span>
                </div>
                <button type="button" className="btn-action-ghost" onClick={() => setRevisionModalOpen(false)}>✕ Kapat</button>
              </div>

              <form onSubmit={handleSaveNewRevision} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ background: 'var(--surface-subtle)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.94rem' }}>🏢 {activeOfferForAction.customerName}</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>{activeOfferForAction.subject}</p>
                </div>

                <div className="new-customer-grid">
                  <label className="select-field">
                    <span>Revizyon Yapan Personel</span>
                    <select
                      value={revisionForm.preparedBy}
                      onChange={(e) => setRevisionForm({ ...revisionForm, preparedBy: e.target.value })}
                    >
                      <option value="Ayşe Yılmaz">👔 Ayşe Yılmaz (Portföy Yöneticisi)</option>
                      <option value="Mehmet Demir">👔 Mehmet Demir (Müşteri Temsilcisi)</option>
                      <option value="Zeynep Kaya">👔 Zeynep Kaya (Saha Satış Sorumlusu)</option>
                      <option value="Caner Şahin">👔 Caner Şahin (İSG Uzmanı)</option>
                      <option value="Dr. Ali Yılmaz">👔 Dr. Ali Yılmaz (İşyeri Hekimi)</option>
                      <option value="Dr. Ayşe Kara">👔 Dr. Ayşe Kara (İşyeri Hekimi)</option>
                      <option value="Uzman Ahmet Yıldız">👔 Uzman Ahmet Yıldız (A Sınıfı İSG Uzmanı)</option>
                      <option value="Uzman Elif Şahin">👔 Uzman Elif Şahin (B Sınıfı İSG Uzmanı)</option>
                      <option value="Selim Can">👔 Selim Can (Operasyon Müdürü)</option>
                      {revisionForm.preparedBy && !['Ayşe Yılmaz','Mehmet Demir','Zeynep Kaya','Caner Şahin','Dr. Ali Yılmaz','Dr. Ayşe Kara','Uzman Ahmet Yıldız','Uzman Elif Şahin','Selim Can'].includes(revisionForm.preparedBy) && (
                        <option value={revisionForm.preparedBy}>👔 {revisionForm.preparedBy}</option>
                      )}
                    </select>
                  </label>

                  <label className="select-field">
                    <span>Revizyon Nedeni / Açıklaması *</span>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Müşteri talebi üzerine %5 genel indirim uygulandı."
                      value={revisionForm.revisionNotes}
                      onChange={(e) => setRevisionForm({ ...revisionForm, revisionNotes: e.target.value })}
                    />
                  </label>

                  <label className="select-field" style={{ gridColumn: 'span 2' }}>
                    <span>Fiyatlandırma Tipi (KDV Durumu) *</span>
                    <select
                      value={revisionForm.vatMode}
                      onChange={(e) => setRevisionForm({ ...revisionForm, vatMode: e.target.value as VatMode })}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="KDV Hariç">KDV Hariç Fiyatlar (Varsayılan)</option>
                      <option value="KDV Dahil">KDV Dahil Fiyatlar (Anlaşılan Toplam)</option>
                    </select>
                  </label>
                </div>

                {/* REVISION SERVICE LINES TABLE */}
                <div>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', display: 'block', marginBottom: 10 }}>
                    📋 Revize Edilecek Kalemler
                  </strong>

                  <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '8px 12px' }}>Hizmet / Kalem Adı</th>
                          <th style={{ padding: '8px 12px' }}>Birim</th>
                          <th style={{ padding: '8px 12px', width: 90 }}>Miktar</th>
                          <th style={{ padding: '8px 12px', width: 110 }}>Birim Fiyat (₺)</th>
                          <th style={{ padding: '8px 12px', width: 90 }}>KDV (%)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {revisionForm.vatMode === 'KDV Dahil' ? 'Tutar (KDV Dahil ₺)' : 'Tutar Net (KDV Hariç ₺)'}
                          </th>
                          <th style={{ padding: '8px 12px', width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {revisionForm.services.map((line, idx) => (
                          <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '6px 12px' }}>
                              <input
                                type="text"
                                value={line.serviceName}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRevisionForm((prev) => {
                                    const updated = [...prev.services];
                                    updated[idx].serviceName = val;
                                    return { ...prev, services: updated };
                                  });
                                }}
                                style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                              />
                            </td>

                            <td style={{ padding: '6px 12px' }}>
                              <input
                                type="text"
                                value={line.unit}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRevisionForm((prev) => {
                                    const updated = [...prev.services];
                                    updated[idx].unit = val;
                                    return { ...prev, services: updated };
                                  });
                                }}
                                style={{ width: 80, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                              />
                            </td>

                            <td style={{ padding: '6px 12px' }}>
                              <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setRevisionForm((prev) => {
                                    const updated = [...prev.services];
                                    updated[idx].quantity = val;
                                    updated[idx].lineTotal = Math.round(val * updated[idx].unitPrice);
                                    return { ...prev, services: updated };
                                  });
                                }}
                                style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 700 }}
                              />
                            </td>

                            <td style={{ padding: '6px 12px' }}>
                              <input
                                type="number"
                                min={0}
                                value={line.unitPrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setRevisionForm((prev) => {
                                    const updated = [...prev.services];
                                    updated[idx].unitPrice = val;
                                    updated[idx].lineTotal = Math.round(updated[idx].quantity * val);
                                    return { ...prev, services: updated };
                                  });
                                }}
                                style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--accent)', fontWeight: 700 }}
                              />
                            </td>

                            <td style={{ padding: '6px 12px' }}>
                              <select
                                value={line.kdvPercent}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setRevisionForm((prev) => {
                                    const updated = [...prev.services];
                                    updated[idx].kdvPercent = val;
                                    return { ...prev, services: updated };
                                  });
                                }}
                                style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: 600 }}
                              >
                                <option value={20}>%20</option>
                                <option value={10}>%10</option>
                                <option value={0}>%0</option>
                              </select>
                            </td>

                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)' }}>
                              ₺{(line.quantity * line.unitPrice).toLocaleString('tr-TR')}
                            </td>

                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                                onClick={() => {
                                  setRevisionForm((prev) => ({
                                    ...prev,
                                    services: prev.services.filter((_, i) => i !== idx)
                                  }));
                                }}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ADD ITEM DROPDOWN OR CUSTOM IN REVISION */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-subtle)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>🏷️ Fiyat Listesinden Hizmet Seçin:</span>
                      <select
                        value={selectedPriceRuleId}
                        onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                        style={{ flex: 1, minWidth: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                      >
                        <option value="">-- Fiyat Listesindeki Hizmetler ({matchingPriceRules.length}) --</option>
                        {matchingPriceRules.map((rule) => (
                          <option key={rule.id} value={rule.id}>
                            {rule.service_name} — ₺{rule.price.toLocaleString('tr-TR')} ({rule.danger_class})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-action-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        onClick={() => handleAddPriceRuleLine(revisionForm.services, (services) => setRevisionForm((prev) => ({ ...prev, services })))}
                      >
                        + Listeden Ekle
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 10, border: '1px dashed var(--border)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>✍️ El İle Özel Kalem Girin:</span>
                      <input
                        type="text"
                        placeholder="Kalem adı"
                        value={customLineInput.serviceName}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, serviceName: e.target.value })}
                        style={{ flex: 1, minWidth: 160, padding: '5px 10px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                      />
                      <input
                        type="number"
                        placeholder="Miktar"
                        min={1}
                        value={customLineInput.quantity}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, quantity: Number(e.target.value) })}
                        style={{ width: 70, padding: '5px 8px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                      />
                      <input
                        type="number"
                        placeholder="Birim Fiyat (₺)"
                        min={0}
                        value={customLineInput.unitPrice || ''}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, unitPrice: Number(e.target.value) })}
                        style={{ width: 110, padding: '5px 8px', fontSize: '0.82rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--accent)', fontWeight: 700 }}
                      />
                      <button
                        type="button"
                        className="btn-action-ghost"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleAddCustomLine(revisionForm.services, (services) => setRevisionForm((prev) => ({ ...prev, services })))}
                      >
                        + El İle Ekle
                      </button>
                    </div>
                  </div>
                </div>

                {/* REVISION OVERALL DISCOUNT */}
                {(() => {
                  const isVatInclusive = revisionForm.vatMode === 'KDV Dahil';
                  const totals = computeOfferFinancials(
                    revisionForm.services,
                    revisionForm.overallDiscountType,
                    revisionForm.overallDiscountValue,
                    revisionForm.vatMode
                  );

                  return (
                    <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: '14px 18px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>💰 Genel İskonto Düzenle</strong>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select
                            value={revisionForm.overallDiscountType}
                            onChange={(e) => setRevisionForm({ ...revisionForm, overallDiscountType: e.target.value as any })}
                            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 600 }}
                          >
                            <option value="percent">% Yüzde İskonto</option>
                            <option value="amount">₺ Tutar İskonto</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={revisionForm.overallDiscountValue || ''}
                            onChange={(e) => setRevisionForm({ ...revisionForm, overallDiscountValue: Number(e.target.value) })}
                            style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: '#ef4444', fontWeight: 700, fontSize: '0.88rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {isVatInclusive ? (
                            <>
                              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Matrah (KDV Hariç): <strong>₺{totals.subtotal.toLocaleString('tr-TR')}</strong></span>
                              {totals.discountTotal > 0 && <span style={{ fontSize: '0.84rem', color: '#ef4444' }}>Uygulanan Genel İskonto: <strong>-₺{totals.discountTotal.toLocaleString('tr-TR')}</strong></span>}
                              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>İç KDV Tutarı (%20): <strong>₺{totals.taxAmount.toLocaleString('tr-TR')}</strong></span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Ara Toplam (Matrah): <strong>₺{totals.subtotal.toLocaleString('tr-TR')}</strong></span>
                              {totals.discountTotal > 0 && <span style={{ fontSize: '0.84rem', color: '#ef4444' }}>Uygulanan Genel İskonto: <strong>-₺{totals.discountTotal.toLocaleString('tr-TR')}</strong></span>}
                              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Hesaplanan KDV Toplamı: <strong>₺{totals.taxAmount.toLocaleString('tr-TR')}</strong></span>
                            </>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>YENİ REVİZYON TUTARI (KDV DAHİL)</span>
                          <span style={{ fontSize: '1.45rem', color: 'var(--accent)', fontWeight: 800 }}>₺{totals.grandTotal.toLocaleString('tr-TR')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                  <button type="button" className="btn-action-ghost" onClick={() => setRevisionModalOpen(false)}>İptal</button>
                  <button type="submit" className="btn-action-primary" style={{ padding: '10px 24px' }}>
                    🔄 Rev. {activeOfferForAction.currentRevisionNo + 1} Oluştur ve Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 4: REVISION HISTORY TIMELINE (REQ 5: DERLİ TOPLU REVİZYON GÖRÜNÜMÜ) */}
      {historyModalOpen && activeOfferForAction &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto'
            }}
            onClick={() => setHistoryModalOpen(false)}
          >
            <div
              style={{
                maxWidth: 880, width: '100%',
                background: 'var(--surface-strong)',
                border: '1px solid var(--border-strong)',
                borderRadius: '20px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                padding: '28px 32px',
                display: 'flex', flexDirection: 'column', gap: 20
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                    📜 Revizyon Geçmişi ({activeOfferForAction.offerNo})
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    🏢 {activeOfferForAction.customerName} - {activeOfferForAction.subject}
                  </span>
                </div>
                <button type="button" className="btn-action-ghost" onClick={() => setHistoryModalOpen(false)}>✕ Kapat</button>
              </div>

              <div className="detail-timeline" style={{ gap: 16 }}>
                {activeOfferForAction.revisions.map((rev) => (
                  <article key={rev.revisionNo} className="panel panel-elevated" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: rev.revisionNo === activeOfferForAction.currentRevisionNo ? '4px solid var(--accent)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="mini-badge" style={{ background: rev.revisionNo === activeOfferForAction.currentRevisionNo ? 'var(--accent-soft)' : 'var(--surface-subtle)', color: rev.revisionNo === activeOfferForAction.currentRevisionNo ? 'var(--accent)' : 'var(--text-main)', border: '1px solid var(--border)', fontWeight: 800 }}>
                          🔄 Revizyon #{rev.revisionNo} {rev.revisionNo === activeOfferForAction.currentRevisionNo ? '(Aktif Son Sürüm)' : ''}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          📅 {rev.revisionDate} • 👤 Hazırlayan: <strong>{rev.preparedBy}</strong>
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                          ₺{rev.grandTotal.toLocaleString('tr-TR')}
                        </strong>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>KDV Dahil</span>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--surface-subtle)', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid var(--border-strong)' }}>
                      📝 <strong>Revizyon Notu:</strong> {rev.revisionNotes}
                    </p>

                    <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '6px 10px' }}>Hizmet / Kalem Adı</th>
                            <th style={{ padding: '6px 10px' }}>Birim</th>
                            <th style={{ padding: '6px 10px' }}>Miktar</th>
                            <th style={{ padding: '6px 10px' }}>Birim Fiyat</th>
                            <th style={{ padding: '6px 10px' }}>KDV (%)</th>
                            <th style={{ padding: '6px 10px', textAlign: 'right' }}>Net Tutar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rev.services.map((s) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px 10px', fontWeight: 600 }}>{s.serviceName}</td>
                              <td style={{ padding: '6px 10px' }}>{s.unit}</td>
                              <td style={{ padding: '6px 10px' }}>{s.quantity}</td>
                              <td style={{ padding: '6px 10px' }}>₺{s.unitPrice.toLocaleString('tr-TR')}</td>
                              <td style={{ padding: '6px 10px' }}>%{s.kdvPercent || 20}</td>
                              <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>₺{(s.quantity * s.unitPrice).toLocaleString('tr-TR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '8px 12px', borderRadius: 6 }}>
                      <span>Ara Toplam: ₺{rev.subtotal.toLocaleString('tr-TR')}</span>
                      <span style={{ color: '#ef4444' }}>Genel İskonto: -₺{rev.discountTotal.toLocaleString('tr-TR')}</span>
                      <span>KDV: ₺{rev.taxAmount.toLocaleString('tr-TR')}</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent)' }}>Genel Toplam: ₺{rev.grandTotal.toLocaleString('tr-TR')}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 5: FORMAL OFFER LETTER PREVIEW */}
      <OfferPdfPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        offer={activeOfferForAction}
      />
    </div>
  );
}

type CustomersPageProps = {
  customers?: CustomerRecord[];
  setCustomers?: React.Dispatch<React.SetStateAction<CustomerRecord[]>>;
  selectedCustomerName?: string | null;
  onSelectCustomerName?: (name: string | null) => void;
  impersonatedTenant?: SaaSTenant | null;
};

export function CustomersPage({
  customers: propCustomers,
  setCustomers: propSetCustomers,
  selectedCustomerName: propSelectedCustomerName,
  onSelectCustomerName: propOnSelectCustomerName,
  impersonatedTenant
}: CustomersPageProps = {}) {
  const [internalCustomers, setInternalCustomers] = useState<CustomerRecord[]>(customerSeeds as CustomerRecord[]);
  const customers = propCustomers || internalCustomers;
  const setCustomers = propSetCustomers || setInternalCustomers;

  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const tenantUsers = useMemo(() => {
    try {
      const currentUserEmail = localStorage.getItem('crm_user_session')?.trim().toLowerCase() || '';
      const tenants = JSON.parse(localStorage.getItem('crm_saas_tenants_v3') || '[]');
      
      let target = impersonatedTenant;
      
      if (!target) {
        target = tenants.find((t: any) => t.email?.trim().toLowerCase() === currentUserEmail) || 
                 tenants.find((t: any) => t.contactName?.trim().toLowerCase() === currentUserEmail) || 
                 tenants.find((t: any) => t.companyName?.toLowerCase().includes('test osgb')) || 
                 tenants[0];
      }

      if (!target) return [];

      const usersMap = JSON.parse(localStorage.getItem('crm_tenant_users_map_v2') || '{}');
      const tUsers = usersMap[target.id] || [];
      
      return [{ name: target.contactName || 'Ana Yetkili', role: 'Ana Yetkili' }, ...tUsers];
    } catch(e) {
      return [];
    }
  }, [impersonatedTenant]);

  const [form, setForm] = useState<NewCustomerForm>(defaultForm);
  const [, setFormErrors] = useState<FormErrors>({});
  const [formHint, setFormHint] = useState('');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(allOption);
  const [cityFilter, setCityFilter] = useState(allOption);
  const [districtFilter, setDistrictFilter] = useState(allOption);
  const [hazardFilter, setHazardFilter] = useState(allOption);
  const [sectorFilter, setSectorFilter] = useState(allOption);

  const [internalSelectedCustomerName, setInternalSelectedCustomerName] = useState<string | null>(null);
  const selectedCustomerName = propSelectedCustomerName !== undefined ? propSelectedCustomerName : internalSelectedCustomerName;
  const setSelectedCustomerName = propOnSelectCustomerName || setInternalSelectedCustomerName;
  const [activeTab, setActiveTab] = useState<CustomerTab>('firm-bilgileri');
  const [sortKey, setSortKey] = useState<CustomerSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [naceSuggestions, setNaceSuggestions] = useState<NaceItem[]>([]);

  // State for Editing Firm Form
  const [editFirmForm, setEditFirmForm] = useState<CustomerRecord | null>(null);
  const [firmSavedNotice, setFirmSavedNotice] = useState(false);

  // Custom Services State (saved in localStorage for persistence)
  const [customServices, setCustomServices] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_custom_services');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newCustomServiceInput, setNewCustomServiceInput] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  // Dynamically Sync All Services from Fiyat Listesi (crm_price_list_v2) + Standard + Custom
  const allDynamicServices = useMemo(() => {
    const baseServices = [
      'İSG Uzmanı',
      'İşyeri Hekimi',
      'DSP (Diğer Sağlık Personeli)',
      'Risk Analizi',
      'Acil Durum Planı',
      'Patlamadan Korunma Dokümanı',
      'Periyodik Kontroller & Ölçümler',
      'İlk Yardım Eğitimi',
      'Mobil Sağlık Tarama',
      'Yangın Eğitimi & Tatbikatı',
      'Yüksekte Çalışma Eğitimi',
      'Hijyen Eğitimi & Denetimi',
      'Ergonomi Risk Değerlendirmesi'
    ];

    let priceListServices: string[] = [];
    try {
      const rawPriceList = localStorage.getItem('crm_price_list_v2');
      if (rawPriceList) {
        const parsed = JSON.parse(rawPriceList);
        if (Array.isArray(parsed)) {
          priceListServices = parsed
            .map((r: any) => r.service_name?.trim())
            .filter((name: string) => name && name.length > 0);
        }
      }
    } catch (e) {
      console.error('Error parsing crm_price_list_v2:', e);
    }

    const cleanServices = [...baseServices, ...priceListServices, ...customServices].flatMap((s) => {
      const t = s.trim();
      if (!t) return [];
      if (t === 'İSG Uzmanı Hizmeti') return ['İSG Uzmanı'];
      if (t === 'İşyeri Hekimi Hizmeti') return ['İşyeri Hekimi'];
      if (t === 'Risk Analizi & Acil Durum Planı') return ['Risk Analizi', 'Acil Durum Planı'];
      if (t === 'Risk Analizi ve Değerlendirme') return ['Risk Analizi'];
      return [t];
    });

    const uniqueSet = new Set(cleanServices);
    return Array.from(uniqueSet);
  }, [customServices]);

  const handleAddCustomService = (serviceToAdd?: string) => {
    const val = (serviceToAdd || newCustomServiceInput).trim();
    if (!val) return;

    if (!allDynamicServices.includes(val)) {
      const updatedCustom = [...customServices, val];
      setCustomServices(updatedCustom);
      localStorage.setItem('crm_custom_services', JSON.stringify(updatedCustom));
    }

    if (editFirmForm) {
      const currentSelected = editFirmForm.requestedServices || [];
      if (!currentSelected.includes(val)) {
        setEditFirmForm({
          ...editFirmForm,
          requestedServices: [...currentSelected, val]
        });
      }
    }

    setNewCustomServiceInput('');
  };

  const handleRemoveCustomService = (serviceToRemove: string) => {
    const updatedCustom = customServices.filter((s) => s !== serviceToRemove);
    setCustomServices(updatedCustom);
    localStorage.setItem('crm_custom_services', JSON.stringify(updatedCustom));

    if (editFirmForm) {
      const currentSelected = editFirmForm.requestedServices || [];
      setEditFirmForm({
        ...editFirmForm,
        requestedServices: currentSelected.filter((s) => s !== serviceToRemove)
      });
    }
  };

  // State for Smart Data Import Wizard
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  // State for Contact Modal (Add / Edit)
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [contactForm, setContactForm] = useState<{
    name: string;
    title: string;
    email: string;
    phone: string;
    extension: string;
    isPrimary: boolean;
    roles: string[];
    notes: string;
  }>({ name: '', title: '', email: '', phone: '', extension: '', isPrimary: false, roles: [], notes: '' });

  // State for Activity Modal (Add / Edit)
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CustomerActivity | null>(null);
  const [activityForm, setActivityForm] = useState<{
    type: CustomerActivity['type'];
    date: string;
    time: string;
    contactPerson: string;
    performedBy: string;
    owner: string;
    subject: string;
    summary: string;
    actionNote: string;
    status: CustomerActivity['status'];
    reminderOffset: NonNullable<CustomerActivity['reminderOffset']>;
    fileName?: string;
    fileDataUrl?: string;
    fileSize?: string;
  }>({
    type: 'Telefon',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    contactPerson: '',
    performedBy: '',
    owner: '',
    subject: '',
    summary: '',
    actionNote: '',
    status: 'Planlandı',
    reminderOffset: '15m'
  });

  // State for activity sorting ('manual' | 'date-desc' | 'date-asc' | 'type')
  const [activitySortMode, setActivitySortMode] = useState<'manual' | 'date-desc' | 'date-asc' | 'type'>('manual');

  useEffect(() => {
    const loadBackendData = async () => {
      setIsLoadingBackend(true);
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session?.user?.email) return;

        const { data: staff } = await supabase
          .from('osgb_staff')
          .select('tenant_id')
          .ilike('email', session.user.email)
          .maybeSingle();

        if (staff?.tenant_id) {
          setAuthContext({ email: session.user.email, tenantId: staff.tenant_id });
        }
      } catch {
        // Fallback to local seeds
      } finally {
        setIsLoadingBackend(false);
      }
    };

    void loadBackendData();
  }, []);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.name === selectedCustomerName) ?? null;
  }, [customers, selectedCustomerName]);

  const autoStatutory = useMemo(() => {
    return calculateIsgStatutoryHours(editFirmForm?.employeeCount || 0, editFirmForm?.hazardClass || 'Tehlikeli');
  }, [editFirmForm?.employeeCount, editFirmForm?.hazardClass]);

  const [isEditNaceFocused, setIsEditNaceFocused] = useState(false);
  const [isNewNaceFocused, setIsNewNaceFocused] = useState(false);

  const [autoSaveTime, setAutoSaveTime] = useState<string | null>(null);
  const isInitialFirmMount = useRef(true);

  // Sync editFirmForm when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      isInitialFirmMount.current = true;
      setEditFirmForm({ ...selectedCustomer });
    }
  }, [selectedCustomer]);

// ==========================================
// TAB: CUSTOMER DOCUMENTS (BAĞLI DOKÜMANLAR & EVRAKLAR)
// ==========================================
function CustomerDocumentsTab({ customer }: { customer: CustomerRecord }) {
  const [allDocs, setAllDocs] = useState<DocumentRecord[]>(() => {
    try {
      const stored = localStorage.getItem('crm_documents_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return documentSeeds;
  });

  const [categoryFilter, setCategoryFilter] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Diğer');
  const [uploadFileName, setUploadFileName] = useState('');

  const saveDocsToLocalStorage = (newList: DocumentRecord[]) => {
    setAllDocs(newList);
    localStorage.setItem('crm_documents_v2', JSON.stringify(newList));
  };

  const customerDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      const isCust = doc.customerName?.trim().toLowerCase() === customer.name.trim().toLowerCase();
      if (!isCust) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || doc.title.toLowerCase().includes(q) || doc.fileName.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'Tümü' || doc.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [allDocs, customer.name, searchQuery, categoryFilter]);

  const handleDeleteDoc = (docId: string) => {
    if (!confirm('Bu doküman kaydını silmek istediğinize emin misiniz?')) return;
    const updated = allDocs.filter((d) => d.id !== docId);
    saveDocsToLocalStorage(updated);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName) return;

    const newDoc: DocumentRecord = {
      id: `doc-${Date.now()}`,
      title: uploadTitle || uploadFileName,
      fileName: uploadFileName,
      category: uploadCategory,
      customerName: customer.name,
      status: 'Onaylandı / Bağlandı',
      uploadDate: new Date().toISOString().split('T')[0],
      fileSize: '2.1 MB',
      fileType: uploadFileName.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF',
      uploadedBy: customer.owner || 'Sistem'
    };

    saveDocsToLocalStorage([newDoc, ...allDocs]);
    setUploadModalOpen(false);
    setUploadTitle('');
    setUploadFileName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
            📂 {customer.name} - Bağlı Dokümanlar & Evraklar ({customerDocs.length})
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Bu müşteriye atanmış veya Dokümanlar modülünden eşleştirilmiş sözleşmeler, raporlar ve izin belgeleri
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Dokümanlarda ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.84rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
          />

          <button
            type="button"
            className="btn-action-primary"
            onClick={() => setUploadModalOpen(true)}
            style={{ padding: '8px 16px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            📤 Bu Müşteriye Evrak / Doküman Yükle
          </button>
        </div>
      </div>

      {/* CATEGORY FILTERS */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Tümü', 'Sözleşme', 'Ek Protokol / Revizyon', 'Teklif Dokümanı', 'Saha & Risk Analiz Raporu', 'Sağlık Muayene Formu', 'Sertifika / Eğitim', 'Diğer'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              borderRadius: 8,
              cursor: 'pointer',
              border: categoryFilter === cat ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: categoryFilter === cat ? 'var(--accent-soft)' : 'var(--surface-subtle)',
              color: categoryFilter === cat ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: categoryFilter === cat ? 700 : 500
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* DOCUMENTS GRID */}
      {customerDocs.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          {customerDocs.map((doc) => (
            <article key={doc.id} className="panel panel-elevated" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'var(--accent-soft)', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4, display: 'inline-block' }}>
                      {doc.category}
                    </span>
                    <strong style={{ fontSize: '1rem', display: 'block', color: 'var(--text-main)', marginTop: 2 }}>{doc.title}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📎 {doc.fileName} ({doc.fileSize || '1.8 MB'})</span>
                  </div>
                  <span
                    className="mini-badge"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: doc.status === 'İmza Bekliyor' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: doc.status === 'İmza Bekliyor' ? '#f59e0b' : '#10b981',
                      border: 'none'
                    }}
                  >
                    {doc.status}
                  </span>
                </div>

                {doc.linkedContractNo && (
                  <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    📜 Bağlı Sözleşme: <strong>{doc.linkedContractNo}</strong>
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  📅 Yükleme Tarihi: {doc.uploadDate || '2026-01-15'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <button type="button" className="btn-action-ghost" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={() => setPreviewDoc(doc)}>
                  👁️ Önizle
                </button>
                <button type="button" className="btn-action-ghost" style={{ padding: '5px 12px', fontSize: '0.78rem', color: '#0284c7' }} onClick={() => alert(`${doc.fileName} indiriliyor...`)}>
                  📥 İndir
                </button>
                <button type="button" className="btn-action-ghost" style={{ padding: '5px 12px', fontSize: '0.78rem', color: '#ef4444' }} onClick={() => handleDeleteDoc(doc.id)}>
                  🗑️ Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel panel-elevated" style={{ padding: 36, textAlign: 'center' }}>
          <span style={{ fontSize: '2.4rem', display: 'block', marginBottom: 8 }}>📂</span>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Bu müşteriye bağlı henüz kayıtlı doküman veya evrak bulunmuyor.
          </p>
          <button type="button" className="btn-action-primary" style={{ marginTop: 14, padding: '8px 18px', fontSize: '0.84rem' }} onClick={() => setUploadModalOpen(true)}>
            + İlk Dokümanı Yükle
          </button>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {uploadModalOpen &&
        createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setUploadModalOpen(false)}>
            <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border-strong)', borderRadius: 20, maxWidth: 500, width: '100%', padding: 24 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 14px', color: 'var(--text-main)' }}>📤 Müşteriye Doküman / Evrak Yükle</h3>
              <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label className="select-field">
                  <span>Doküman Başlığı *</span>
                  <input type="text" required placeholder="Örn: 2026 İşyeri Hekimliği Sözleşmesi" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                </label>
                <label className="select-field">
                  <span>Doküman Kategorisi</span>
                  <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}>
                    <option value="Sözleşme">Sözleşme</option>
                    <option value="Ek Protokol / Revizyon">Ek Protokol / Revizyon</option>
                    <option value="Teklif Dokümanı">Teklif Dokümanı</option>
                    <option value="Saha & Risk Analiz Raporu">Saha & Risk Analiz Raporu</option>
                    <option value="Sağlık Muayene Formu">Sağlık Muayene Formu</option>
                    <option value="Sertifika / Eğitim">Sertifika / Eğitim</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </label>
                <label className="select-field">
                  <span>Dosya Seç (.pdf, .docx, .scanned) *</span>
                  <input type="file" required onChange={(e) => setUploadFileName(e.target.files?.[0]?.name || '')} />
                </label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="button" className="btn-action-ghost" onClick={() => setUploadModalOpen(false)}>İptal</button>
                  <button type="submit" className="btn-action-primary">✓ Yükle ve Kaydet</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* PREVIEW MODAL */}
      {previewDoc &&
        createPortal(
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setPreviewDoc(null)}>
            <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border-strong)', borderRadius: 20, maxWidth: 650, width: '100%', padding: 24 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, color: 'var(--text-main)' }}>👁️ Doküman Önizleme: {previewDoc.title}</h3>
                <button type="button" className="btn-action-ghost" onClick={() => setPreviewDoc(null)}>✕</button>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                <p><strong>Dosya Adı:</strong> {previewDoc.fileName}</p>
                <p><strong>Müşteri:</strong> {previewDoc.customerName}</p>
                <p><strong>Kategori:</strong> {previewDoc.category}</p>
                <p><strong>Durum:</strong> {previewDoc.status}</p>
                <p><strong>Yükleme Tarihi:</strong> {previewDoc.uploadDate || '2026-01-15'}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn-action-primary" onClick={() => setPreviewDoc(null)}>Tamam</button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

  // Continuous Auto-Save when editFirmForm changes
  useEffect(() => {
    if (isInitialFirmMount.current) {
      isInitialFirmMount.current = false;
      return;
    }

    if (!editFirmForm || !selectedCustomer) return;

    setCustomers((prev) =>
      prev.map((c) => (c.name === selectedCustomer.name || c.id === editFirmForm.id ? { ...c, ...editFirmForm } : c))
    );

    const nowTimeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAutoSaveTime(nowTimeStr);
  }, [editFirmForm]);

  const statusOptions = useMemo(() => createOptions(customers.map((c) => c.status)), [customers]);
  const cityOptions = useMemo(() => createOptions(customers.map((c) => c.city)), [customers]);
  const districtOptions = useMemo(() => createOptions(customers.map((c) => c.district)), [customers]);
  const hazardOptions = useMemo(() => createOptions(customers.map((c) => c.hazardClass)), [customers]);
  const sectorOptions = useMemo(() => createOptions(customers.map((c) => c.sector)), [customers]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr-TR');

    return customers.filter((customer) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [customer.name, customer.owner, customer.contact, customer.city, customer.district, customer.status, customer.sector, customer.naceCode]
          .join(' ')
          .toLocaleLowerCase('tr-TR')
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === allOption || customer.status === statusFilter;
      const matchesCity = cityFilter === allOption || customer.city === cityFilter;
      const matchesDistrict = districtFilter === allOption || customer.district === districtFilter;
      const matchesHazard = hazardFilter === allOption || customer.hazardClass === hazardFilter;
      const matchesSector = sectorFilter === allOption || customer.sector === sectorFilter;

      return matchesQuery && matchesStatus && matchesCity && matchesDistrict && matchesHazard && matchesSector;
    });
  }, [customers, query, statusFilter, cityFilter, districtFilter, hazardFilter, sectorFilter]);

  const sortedCustomers = useMemo(() => {
    const getSortValue = (customer: CustomerRecord): string | number => {
      switch (sortKey) {
        case 'status':
          return customer.status;
        case 'location':
          return `${customer.city} ${customer.district}`;
        case 'hazardClass':
          return customer.hazardClass;
        case 'sector':
          return customer.sector;
        case 'employeeCount':
          return customer.employeeCount;
        case 'owner':
          return customer.owner;
        case 'name':
        default:
          return customer.name;
      }
    };

    return [...filteredCustomers].sort((left, right) => {
      const leftValue = getSortValue(left);
      const rightValue = getSortValue(right);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      const textCompare = String(leftValue).localeCompare(String(rightValue), 'tr-TR');
      return sortDirection === 'asc' ? textCompare : -textCompare;
    });
  }, [filteredCustomers, sortKey, sortDirection]);

  const handleSort = (column: CustomerSortKey) => {
    if (sortKey === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(column);
    setSortDirection('asc');
  };

  const sortIcon = (column: CustomerSortKey) => {
    if (sortKey !== column) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // --- SAVE UPDATED FIRM FORM ---
  const handleSaveFirmDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirmForm || !selectedCustomer) return;

    setCustomers((prev) =>
      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, ...editFirmForm } : c))
    );

    setFirmSavedNotice(true);
    setTimeout(() => setFirmSavedNotice(false), 3000);
  };

  // --- CONTACT CRUD HANDLERS ---
  const handleOpenAddContact = () => {
    setEditingContact(null);
    setContactForm({
      name: '',
      title: '',
      email: '',
      phone: '',
      extension: '',
      isPrimary: false,
      roles: [],
      notes: ''
    });
    setContactModalOpen(true);
  };

  const handleOpenEditContact = (contact: CustomerContact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      extension: contact.extension || '',
      isPrimary: Boolean(contact.isPrimary),
      roles: contact.roles || (contact.isPrimary ? ['primary'] : []),
      notes: contact.notes || ''
    });
    setContactModalOpen(true);
  };

  const handleSaveContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const currentContacts = selectedCustomer.contactsList || [];
    let updatedContacts: CustomerContact[];

    if (editingContact) {
      updatedContacts = currentContacts.map((cnt) =>
        cnt.id === editingContact.id ? { ...cnt, ...contactForm } : cnt
      );
    } else {
      const newContactObj: CustomerContact = {
        id: `cnt-${Date.now()}`,
        ...contactForm
      };
      updatedContacts = [...currentContacts, newContactObj];
    }

    setCustomers((prev) =>
      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, contactsList: updatedContacts } : c))
    );

    setContactModalOpen(false);
  };

  const handleDeleteContact = (contactId: string) => {
    if (!selectedCustomer) return;
    if (!confirm('Bu iletişim kişisini silmek istediğinize emin misiniz?')) return;

    const updatedContacts = (selectedCustomer.contactsList || []).filter((cnt) => cnt.id !== contactId);
    setCustomers((prev) =>
      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, contactsList: updatedContacts } : c))
    );
  };

  // --- OSGB STAFF OPTIONS FOR ACTIVITIES ---
  // We use tenantUsers instead of a hardcoded array.
  const handleOpenAddActivity = () => {
    setEditingActivity(null);
    const defaultContact = selectedCustomer?.contactsList?.[0]
      ? `${selectedCustomer.contactsList[0].name}${selectedCustomer.contactsList[0].title ? ` (${selectedCustomer.contactsList[0].title})` : ''}`
      : selectedCustomer?.contact || '';

    const defaultStaff = selectedCustomer?.owner
      ? `${selectedCustomer.owner} (Müşteri Temsilcisi)`
      : tenantUsers.length > 0 ? `${tenantUsers[0].name} (${tenantUsers[0].role})` : '';

    setActivityForm({
      type: 'Telefon',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      contactPerson: defaultContact,
      performedBy: defaultStaff,
      owner: selectedCustomer?.owner || '',
      subject: '',
      summary: '',
      actionNote: '',
      status: 'Planlandı',
      reminderOffset: '15m',
      fileName: undefined,
      fileDataUrl: undefined,
      fileSize: undefined
    });
    setActivityModalOpen(true);
  };

  const handleOpenEditActivity = (activity: CustomerActivity) => {
    setEditingActivity(activity);
    setActivityForm({
      type: activity.type,
      date: activity.date,
      time: activity.time || '10:00',
      contactPerson: activity.contactPerson || '',
      performedBy: activity.performedBy || activity.owner || (tenantUsers.length > 0 ? `${tenantUsers[0].name} (${tenantUsers[0].role})` : ''),
      owner: activity.owner,
      subject: activity.subject,
      summary: activity.summary,
      actionNote: activity.actionNote || '',
      status: activity.status,
      reminderOffset: activity.reminderOffset || '15m',
      fileName: activity.fileName,
      fileDataUrl: activity.fileDataUrl,
      fileSize: activity.fileSize
    });
    setActivityModalOpen(true);
  };

  const handleSaveActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const currentActivities = selectedCustomer.activitiesList || [];
    let updatedActivities: CustomerActivity[];

    if (editingActivity) {
      updatedActivities = currentActivities.map((act) =>
        act.id === editingActivity.id ? { ...act, ...activityForm } : act
      );
    } else {
      const newActObj: CustomerActivity = {
        id: `act-${Date.now()}`,
        ...activityForm
      };
      updatedActivities = [newActObj, ...currentActivities];
    }

    setCustomers((prev) =>
      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, activitiesList: updatedActivities } : c))
    );

    setActivityModalOpen(false);
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!selectedCustomer) return;
    if (!confirm('Bu aktivite kaydını silmek istediğinize emin misiniz?')) return;

    const updatedActivities = (selectedCustomer.activitiesList || []).filter((act) => act.id !== activityId);
    setCustomers((prev) =>
      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, activitiesList: updatedActivities } : c))
    );
  };

  const handleToggleActivityStatus = (activityId: string) => {
    if (!selectedCustomer) return;
    const updatedActivities: CustomerActivity[] = (selectedCustomer.activitiesList || []).map((act) => {
      if (act.id === activityId) {
        const nextStatus: CustomerActivity['status'] = act.status === 'Tamamlandı' ? 'Planlandı' : 'Tamamlandı';
        return { ...act, status: nextStatus };
      }
      return act;
    });

    setCustomers((prev) =>
      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, activitiesList: updatedActivities } : c))
    );
  };

  const handleMoveActivity = (fromIndex: number, toIndex: number) => {
    if (!selectedCustomer) return;
    const currentActs = [...(selectedCustomer.activitiesList || [])];
    if (toIndex < 0 || toIndex >= currentActs.length) return;
    const temp = currentActs[fromIndex];
    currentActs[fromIndex] = currentActs[toIndex];
    currentActs[toIndex] = temp;

    setCustomers((prev) =>
      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, activitiesList: currentActs } : c))
    );
  };

  // --- RENDER TAB CONTENTS ---
  const renderDetailTab = (customer: CustomerRecord) => {
    switch (activeTab) {
      // REQ 3: FIRMA BILGILERI & İHTİYAÇ ANALİZİ (FORM VIEW)
      case 'firm-bilgileri':
      default:
        if (!editFirmForm) return null;

        const autoStatutory = calculateIsgStatutoryHours(editFirmForm.employeeCount || 0, editFirmForm.hazardClass || 'Tehlikeli');

        return (
          <form onSubmit={handleSaveFirmDetails} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {firmSavedNotice && (
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 18px', borderRadius: 12, color: '#10b981', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✓ Firma Bilgileri ve İhtiyaç Analizi başarıyla güncellendi!</span>
                <span className="mini-badge" style={{ background: '#10b981', color: '#fff', border: 'none' }}>KAYDEDİLDİ</span>
              </div>
            )}

            {/* 📌 BÖLÜM 1: TEMEL FİRMA & KİMLİK BİLGİLERİ */}
            <details className="form-accordion-section-customer">
              <summary>
                <span>🏢 1. Temel Firma & Kimlik Bilgileri</span>
                <span className="accordion-status-badge">Aç / Kapat ▼</span>
              </summary>
              <div className="new-customer-grid">
                <label className="select-field">
                  <span>Firma Resmi Unvanı *</span>
                  <input
                    type="text"
                    required
                    value={editFirmForm.name}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, name: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Sorumlu</span>
                  <select
                    value={editFirmForm.owner || ''}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, owner: e.target.value })}
                  >
                    <option value="">Atanmadı</option>
                    {tenantUsers.map((u, i) => (
                      <option key={i} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </label>
                <label className="select-field">
                  <span>Vergi Dairesi</span>
                  <input
                    type="text"
                    value={editFirmForm.taxOffice || ''}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, taxOffice: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Vergi Numarası</span>
                  <input
                    type="text"
                    value={editFirmForm.taxNo || ''}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, taxNo: e.target.value })}
                  />
                </label>

                <label className="select-field" style={{ position: 'relative' }}>
                  <span>NACE Kodu & Faaliyet Tanımı</span>
                  <input
                    type="text"
                    placeholder="NACE kodu veya sektör yazın (örn: 28.11, depolama, inşaat, metal, gıda)..."
                    value={editFirmForm.naceCode || ''}
                    onFocus={() => setIsEditNaceFocused(true)}
                    onBlur={() => setTimeout(() => setIsEditNaceFocused(false), 200)}
                    onChange={(e) => {
                      setEditFirmForm({ ...editFirmForm, naceCode: e.target.value });
                      setIsEditNaceFocused(true);
                    }}
                  />
                  {editFirmForm.naceCode && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'block', marginTop: 2 }}>
                      💡 Faaliyet Tanımı:{' '}
                      {comprehensiveNaceList.find((n) => n.nace_code === editFirmForm.naceCode)?.description ||
                        'Özel NACE Kodu Tanımlı'}
                    </span>
                  )}

                  {/* LIVE ACCESSIBLE NACE DROPDOWN */}
                  {isEditNaceFocused && editFirmForm.naceCode && searchNaceCodes(editFirmForm.naceCode).length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 2px)',
                        left: 0,
                        right: 0,
                        zIndex: 9999,
                        background: 'var(--surface-strong)',
                        border: '2px solid var(--accent)',
                        borderRadius: '12px',
                        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.55)',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        padding: '6px'
                      }}
                    >
                      {searchNaceCodes(editFirmForm.naceCode).map((item) => (
                        <div
                          key={item.nace_code}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            background: 'transparent',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setEditFirmForm({
                              ...editFirmForm,
                              naceCode: item.nace_code,
                              hazardClass: item.danger_class
                            });
                            setIsEditNaceFocused(false);
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--accent)' }}>{item.nace_code}</strong>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: item.danger_class === 'Çok Tehlikeli' ? 'rgba(239, 68, 68, 0.15)' : item.danger_class === 'Tehlikeli' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: item.danger_class === 'Çok Tehlikeli' ? '#ef4444' : item.danger_class === 'Tehlikeli' ? '#f59e0b' : '#10b981'
                              }}
                            >
                              ● {item.danger_class}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block' }}>{item.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </label>

                <label className="select-field">
                  <span>Sektör</span>
                  <input
                    type="text"
                    value={editFirmForm.sector}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, sector: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>🎯 Fırsat Kaynağı</span>
                  <select
                    value={editFirmForm.leadSource || 'Web Sitesi Formu'}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, leadSource: e.target.value })}
                  >
                    {leadSourceOptions.map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </label>
              </div>
            </details>

            {/* 📌 BÖLÜM 2: İLETİŞİM, WEB & LOKASYON BİLGİLERİ */}
            <details className="form-accordion-section-customer">
              <summary>
                <span>📍 2. İletişim, Web & Lokasyon Bilgileri</span>
                <span className="accordion-status-badge">Aç / Kapat ▼</span>
              </summary>
              <div className="new-customer-grid">
                <label className="select-field">
                  <span>Şehir</span>
                  <input
                    type="text"
                    value={editFirmForm.city}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, city: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>İlçe</span>
                  <input
                    type="text"
                    value={editFirmForm.district}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, district: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Telefon</span>
                  <input
                    type="text"
                    value={editFirmForm.phone || ''}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, phone: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>E-posta</span>
                  <input
                    type="email"
                    value={editFirmForm.email || ''}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, email: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Web Sitesi</span>
                  <input
                    type="text"
                    value={editFirmForm.website || ''}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, website: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>🏢 Lokasyon / Şube Sayısı</span>
                  <input
                    type="number"
                    min={1}
                    placeholder="Örn: 1"
                    value={editFirmForm.locationCount ?? 1}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, locationCount: e.target.value })}
                  />
                </label>

                <label className="select-field new-customer-full">
                  <span>Açık Adres</span>
                  <textarea
                    rows={2}
                    value={editFirmForm.address || ''}
                    onChange={(e) => setEditFirmForm({ ...editFirmForm, address: e.target.value })}
                  />
                </label>
              </div>
            </details>

            {/* 📌 BÖLÜM 3: İSG HİZMET PARAMETRELERİ & ÇALIŞAN YAPISI */}
            <details className="form-accordion-section-customer">
              <summary>
                <span>⚖️ 3. İSG Hizmet Parametreleri & Çalışan Yapısı</span>
                <span className="accordion-status-badge">Aç / Kapat ▼</span>
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* 👥 GRUP A: ÇALIŞAN KADROSU & TEHLİKE SINIFI */}
                <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h5 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    👥 Çalışan Kadrosu & Tehlike Sınıfı
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                    {/* SATIR 1 */}
                    <label className="select-field">
                      <span>Tehlike Sınıfı</span>
                      <select
                        value={editFirmForm.hazardClass}
                        onChange={(e) => setEditFirmForm({ ...editFirmForm, hazardClass: e.target.value })}
                      >
                        {hazardClassOptions.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </label>

                    <label className="select-field">
                      <span>⏰ Vardiya Yapısı</span>
                      <select
                        value={editFirmForm.shiftStructure || 'Tek Vardiya (Gündüz)'}
                        onChange={(e) => setEditFirmForm({ ...editFirmForm, shiftStructure: e.target.value })}
                      >
                        <option value="Tek Vardiya (Gündüz)">Tek Vardiya (Gündüz 08:00 - 18:00)</option>
                        <option value="2 Vardiya (Gündüz & Gece)">2 Vardiya (Gündüz & Gece)</option>
                        <option value="3 Vardiya (24 Saat Kesintisiz)">3 Vardiya (24 Saat Kesintisiz)</option>
                        <option value="Esnek / Özel Vardiya Düzeni">Esnek / Özel Vardiya Düzeni</option>
                      </select>
                    </label>

                    {/* SATIR 2 */}
                    <label className="select-field">
                      <span>Çalışan Sayısı (Kadro)</span>
                      <input
                        type="number"
                        value={editFirmForm.employeeCount}
                        onChange={(e) => setEditFirmForm({ ...editFirmForm, employeeCount: Number(e.target.value) })}
                      />
                    </label>

                    <label className="select-field">
                      <span>♿ Engelli Çalışan Sayısı</span>
                      <input
                        type="number"
                        placeholder="Örn: 2"
                        value={editFirmForm.disabledEmployeeCount || ''}
                        onChange={(e) => setEditFirmForm({ ...editFirmForm, disabledEmployeeCount: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                </div>

                {/* ⏱️ GRUP B: İSG HİZMET SÜRELERİ & UZMAN SINIFI (3 ALAN YAN YANA) */}
                <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h5 style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⏱️ İSG Hizmet Süreleri & Uzman Sınıfı
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                    <label className="select-field">
                      <span>Uzman Sınıfı İhtiyacı</span>
                      <select
                        value={editFirmForm.expertClassNeed || autoStatutory.defaultExpertClass}
                        onChange={(e) => setEditFirmForm({ ...editFirmForm, expertClassNeed: e.target.value })}
                      >
                        <option value="A Sınıfı">A Sınıfı İSG Uzmanı</option>
                        <option value="B Sınıfı">B Sınıfı İSG Uzmanı</option>
                        <option value="C Sınıfı">C Sınıfı İSG Uzmanı</option>
                        <option value="A veya B Sınıfı">A veya B Sınıfı Uzman</option>
                        <option value="B veya C Sınıfı">B veya C Sınıfı Uzman</option>
                      </select>
                    </label>

                    <label className="select-field">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Uzman Hizmet Süresi (saat/ay)</span>
                        <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>⚡ Otomatik Hesap</span>
                      </div>
                      <input
                        type="number"
                        placeholder="Örn: 173"
                        value={editFirmForm.expertMonthlyHours ?? autoStatutory.expertHours}
                        onChange={(e) => setEditFirmForm({ ...editFirmForm, expertMonthlyHours: Number(e.target.value) })}
                        style={{ background: 'var(--surface-strong)', fontWeight: 700, color: 'var(--accent)' }}
                      />
                    </label>

                    <label className="select-field">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Hekim Hizmet Süresi (saat/ay)</span>
                        <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>⚡ Otomatik Hesap</span>
                      </div>
                      <input
                        type="number"
                        placeholder="Örn: 87"
                        value={editFirmForm.doctorMonthlyHours ?? autoStatutory.doctorHours}
                        onChange={(e) => setEditFirmForm({ ...editFirmForm, doctorMonthlyHours: Number(e.target.value) })}
                        style={{ background: 'var(--surface-strong)', fontWeight: 700, color: 'var(--accent)' }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </details>

            {/* 📌 BÖLÜM 4: HİZMET KAPSAMI, İHTİYAÇ ANALİZİ & NOTLAR */}
            <details className="form-accordion-section-customer">
              <summary>
                <span>🛠️ 4. Hizmet Kapsamı, İhtiyaç Analizi & Özel Notlar</span>
                <span className="accordion-status-badge">Aç / Kapat ▼</span>
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Talep Edilen Hizmet ve Ürün Türleri
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 800, background: 'var(--accent-soft)', padding: '2px 10px', borderRadius: 12 }}>
                        {editFirmForm.requestedServices?.length || 0} Hizmet Seçildi
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="🔍 Hizmetlerde ara..."
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        style={{ padding: '5px 10px', fontSize: '0.82rem', width: 170, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                      />
                      <button
                        type="button"
                        className="secondary-action"
                        style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                        onClick={() => setEditFirmForm({ ...editFirmForm, requestedServices: [...allDynamicServices] })}
                      >
                        Tümünü Seç
                      </button>
                      <button
                        type="button"
                        className="secondary-action"
                        style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                        onClick={() => setEditFirmForm({ ...editFirmForm, requestedServices: [] })}
                      >
                        Temizle
                      </button>
                    </div>
                  </div>

                  {/* CHIP LIST GRID */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    {allDynamicServices
                      .filter((srv) => !serviceSearchQuery || srv.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
                      .map((srv) => {
                        const currentSelected = editFirmForm.requestedServices || [];
                        const isChecked = currentSelected.includes(srv);
                        const isCustom = customServices.includes(srv);

                        return (
                          <div
                            key={srv}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: isChecked ? '1px solid var(--accent)' : '1px solid var(--border)',
                              background: isChecked ? 'var(--accent-soft)' : 'var(--surface-strong)',
                              transition: 'all 0.15s ease',
                              boxShadow: isChecked ? '0 2px 8px rgba(16, 185, 129, 0.12)' : 'none'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const nextList = isChecked
                                  ? currentSelected.filter((s) => s !== srv)
                                  : [...currentSelected, srv];
                                setEditFirmForm({ ...editFirmForm, requestedServices: nextList });
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: '7px 12px',
                                fontSize: '0.84rem',
                                fontWeight: isChecked ? 700 : 500,
                                color: isChecked ? 'var(--accent)' : 'var(--text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <span>{isChecked ? '✓' : '➕'}</span>
                              <span>{srv}</span>
                            </button>

                            {isCustom && (
                              <button
                                type="button"
                                title="Bu özel hizmeti listeden kaldır"
                                onClick={() => handleRemoveCustomService(srv)}
                                style={{
                                  border: 'none',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#ef4444',
                                  padding: '7px 8px',
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  lineHeight: 1
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* INLINE DYNAMIC SERVICE ADDITION FORM */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 10, border: '1px dashed var(--border)' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      ➕ Özel Hizmet / Ürün Ekle:
                    </span>
                    <input
                      type="text"
                      placeholder="Örn: Yangın Tatbikatı, Yüksekte Çalışma Eğitimi, Ortam Ölçümü..."
                      value={newCustomServiceInput}
                      onChange={(e) => setNewCustomServiceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomService();
                        }
                      }}
                      style={{ flex: 1, padding: '6px 12px', fontSize: '0.84rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                    />
                    <button
                      type="button"
                      className="btn-action-primary"
                      onClick={() => handleAddCustomService()}
                      style={{ padding: '6px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                    >
                      + Ekle ve Seç
                    </button>
                  </div>
                </div>

                <div className="new-customer-grid" style={{ marginTop: 14 }}>
                  <label className="select-field">
                    <span>Ziyaret Periyodu & Sıklığı</span>
                    <select
                      value={editFirmForm.visitFrequency || 'Aylık'}
                      onChange={(e) => setEditFirmForm({ ...editFirmForm, visitFrequency: e.target.value })}
                    >
                      {visitFrequencyOptions.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </label>

                  <label className="select-field new-customer-full">
                    <span>İhtiyaç Analizi Notları & Genel İstekler</span>
                    <textarea
                      rows={3}
                      placeholder="Müşterinin özel vardiya yapısı, lokasyon riskleri ve uzman/hekim beklenti detayları..."
                      value={editFirmForm.needsAnalysisNotes || ''}
                      onChange={(e) => setEditFirmForm({ ...editFirmForm, needsAnalysisNotes: e.target.value })}
                    />
                  </label>

                  <label className="select-field new-customer-full">
                    <span>♿ Engelli Personel & Özel Politika Gerektiren Gruplar Notu</span>
                    <textarea
                      rows={2}
                      placeholder="Engelli çalışanların departmanları, erişilebilirlik gereksinimleri, gebe/genç çalışan özel İSG önlemleri..."
                      value={editFirmForm.specialGroupsNotes || ''}
                      onChange={(e) => setEditFirmForm({ ...editFirmForm, specialGroupsNotes: e.target.value })}
                    />
                  </label>

                  <label className="select-field new-customer-full">
                    <span>Firma Notları & Özel Açıklamalar</span>
                    <textarea
                      rows={2}
                      placeholder="Firma hakkında genel notlar, özel şartlar veya ek talep bilgileri..."
                      value={editFirmForm.note || ''}
                      onChange={(e) => setEditFirmForm({ ...editFirmForm, note: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            </details>

            {/* SAVE BUTTON INDICATOR */}
            <div style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <button
                type="submit"
                className="btn-action-primary"
                style={{
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  fontWeight: 700
                }}
              >
                ⚡ Otomatik Kaydedildi {autoSaveTime ? `(Son: ${autoSaveTime})` : ''}
              </button>
            </div>
          </form>
        );

      // REQ 4: İLETİŞİM KİŞİLERİ (FULL CRUD)
      case 'iletisim-kisileri':
        const contacts = customer.contactsList || [];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>İletişim Kişileri ({contacts.length})</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Firma bünyesinde yetkili ve iletişimde olunan personel kadrosu
                </p>
              </div>

              <button type="button" className="btn-action-primary" onClick={handleOpenAddContact}>
                + Yeni İletişim Kişisi Ekle
              </button>
            </div>

            {contacts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                {contacts.map((cnt) => {
                  const assignedRoles = cnt.roles || (cnt.isPrimary ? ['primary'] : []);

                  return (
                    <article key={cnt.id} className="panel panel-elevated" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <strong style={{ fontSize: '1.05rem', display: 'block' }}>{cnt.name}</strong>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{cnt.title}</span>
                          </div>
                          {cnt.isPrimary && (
                            <span className="mini-badge" style={{ background: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', border: 'none' }}>
                              ⭐ Birincil Yetkili
                            </span>
                          )}
                        </div>

                        {/* ASSIGNED ROLES BADGES */}
                        {assignedRoles.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
                            {assignedRoles.map((roleVal) => {
                              const rOpt = contactRoleOptions.find((r) => r.value === roleVal);
                              if (!rOpt) return null;
                              return (
                                <span
                                  key={roleVal}
                                  className="mini-badge"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    background: roleVal === 'primary' ? 'rgba(245, 158, 11, 0.14)' : roleVal === 'invoice' ? 'rgba(16, 185, 129, 0.14)' : roleVal === 'contract' ? 'rgba(99, 102, 241, 0.14)' : 'var(--surface-subtle)',
                                    color: roleVal === 'primary' ? '#f59e0b' : roleVal === 'invoice' ? '#10b981' : roleVal === 'contract' ? '#6366f1' : 'var(--text-main)',
                                    border: '1px solid var(--border)',
                                    fontWeight: 600
                                  }}
                                >
                                  {rOpt.icon} {rOpt.label}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem', color: 'var(--text-main)', marginTop: 8 }}>
                          <span>✉️ E-posta: <strong style={{ fontWeight: 500 }}>{cnt.email || '-'}</strong></span>
                          <span>📞 Telefon: <strong style={{ fontWeight: 500 }}>{cnt.phone || '-'}{cnt.extension ? ` (Dahili: ${cnt.extension})` : ''}</strong></span>
                          {cnt.notes && <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>📝 Not: {cnt.notes}</p>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <button type="button" className="btn-action-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleOpenEditContact(cnt)}>
                          ✏️ Düzenle
                        </button>
                        <button type="button" className="btn-action-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }} onClick={() => handleDeleteContact(cnt.id)}>
                          🗑️ Sil
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="panel panel-elevated" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Henüz kayıtlı iletişim kişisi bulunmuyor. Yukardaki butonla hemen ekleyebilirsiniz.</p>
              </div>
            )}
          </div>
        );

      // REQ 5: AKTİVİTELER (FULL CRUD & TIMELINE)
      case 'aktiviteler':
        const rawActivities = customer.activitiesList || [];
        const ACT_ICONS: Record<string, string> = {
          Telefon: '📞',
          Toplantı: '🤝',
          'E-posta': '✉️',
          WhatsApp: '💬',
          Ziyaret: '🚗',
          Demo: '💻',
          Sunum: '📊',
          Not: '📌'
        };

        // Sort activities based on activitySortMode
        const sortedActivities = [...rawActivities].sort((a, b) => {
          if (activitySortMode === 'date-desc') {
            return `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`);
          }
          if (activitySortMode === 'date-asc') {
            return `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`);
          }
          if (activitySortMode === 'type') {
            return a.type.localeCompare(b.type, 'tr');
          }
          return 0; // 'manual' retains current list order
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h4 style={{ margin: 0 }}>Görüşme & Aktivite Zaman Tüneli ({rawActivities.length})</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Müşteri ile yapılan tüm telefon, toplantı, e-posta, WhatsApp, ziyaret, demo, sunum ve not kayıtları
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* SORT MODE SELECTOR */}
                <select
                  value={activitySortMode}
                  onChange={(e) => setActivitySortMode(e.target.value as any)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-strong)',
                    color: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                  title="Sıralama Modu"
                >
                  <option value="manual">↕️ Özel Sıralama (Manuel)</option>
                  <option value="date-desc">📅 En Yeni Tarih İlk</option>
                  <option value="date-asc">📅 En Eski Tarih İlk</option>
                  <option value="type">🏷️ Aktivite Tipine Göre</option>
                </select>

                <button type="button" className="btn-action-primary" onClick={handleOpenAddActivity}>
                  + Yeni Aktivite Ekle
                </button>
              </div>
            </div>

            {sortedActivities.length > 0 ? (
              <div className="detail-timeline" style={{ gap: 14 }}>
                {sortedActivities.map((act) => {
                  const rawIndex = rawActivities.findIndex((a) => a.id === act.id);
                  return (
                    <article key={act.id} className="panel panel-elevated" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="mini-badge" style={{ background: 'var(--accent-soft)', color: 'var(--text-main)', border: '1px solid var(--border)', fontWeight: 600 }}>
                            {(ACT_ICONS[act.type] || '📌')} {act.type}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            📅 {act.date} {act.time ? `• ${act.time}` : ''}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {act.reminderOffset && act.reminderOffset !== 'none' && (
                            <span className="mini-badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: 'none', fontSize: '0.74rem' }}>
                              ⏰ {act.reminderOffset === '15m' ? '15 Dk Önce' : act.reminderOffset === 'at_time' ? 'Tam Zamanında' : act.reminderOffset === '30m' ? '30 Dk Önce' : act.reminderOffset === '1h' ? '1 Saat Önce' : '1 Gün Önce'}
                            </span>
                          )}
                          <button
                            type="button"
                            className="mini-badge"
                            onClick={() => handleToggleActivityStatus(act.id)}
                            style={{
                              cursor: 'pointer',
                              background: act.status === 'Tamamlandı' ? 'rgba(16, 185, 129, 0.16)' : act.status === 'İptal Edildi' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(245, 158, 11, 0.16)',
                              color: act.status === 'Tamamlandı' ? '#10b981' : act.status === 'İptal Edildi' ? '#ef4444' : '#f59e0b',
                              border: 'none',
                              fontWeight: 700
                            }}
                          >
                            {(() => {
                              if (act.status === 'Tamamlandı') return '✓ Tamamlandı';
                              if (act.status === 'İptal Edildi') return '✕ İptal Edildi';

                              const now = new Date();
                              const dueDate = new Date(`${act.date}T${act.time || '09:00'}:00`);
                              if (!isNaN(dueDate.getTime())) {
                                const diffMins = Math.floor((dueDate.getTime() - now.getTime()) / 60000);
                                if (diffMins < 0) return `⚠️ Gecikmiş (${Math.abs(diffMins) < 60 ? `${Math.abs(diffMins)} dk` : `${Math.floor(Math.abs(diffMins) / 60)} st`})`;
                                if (diffMins <= 1440) return `🟡 Yaklaşıyor (${diffMins < 60 ? `${diffMins} dk kaldı` : `${Math.floor(diffMins / 60)} st kaldı`})`;
                              }
                              return '📅 Planlandı';
                            })()} (Değiştir)
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ margin: '4px 0 6px', fontSize: '1.05rem' }}>{act.subject}</h4>
                        {act.summary ? <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)' }}>{act.summary}</p> : null}
                      </div>

                      <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        {act.performedBy && <span>👔 Gerçekleştiren Personel: <strong style={{ color: 'var(--text-main)' }}>{act.performedBy}</strong></span>}
                        {act.contactPerson && <span>👤 Görüşülen (Müşteri): <strong>{act.contactPerson}</strong></span>}
                        {act.owner && <span>👤 Sorumlu: <strong>{act.owner}</strong></span>}
                        {act.actionNote && <span style={{ color: '#f59e0b' }}>📌 Aksiyon Notu: <strong>{act.actionNote}</strong></span>}
                      </div>

                      {act.fileName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                          <a
                            href={act.fileDataUrl || '#'}
                            download={act.fileName}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 12px',
                              borderRadius: 8,
                              background: 'rgba(99, 102, 241, 0.12)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              color: '#6366f1',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            📎 Ekli Doküman: <span>{act.fileName}</span> {act.fileSize ? `(${act.fileSize})` : ''} 📥 İndir / Görüntüle
                          </a>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                        {/* MANUAL REORDER BUTTONS */}
                        <div style={{ display: 'flex', gap: 4, marginRight: 'auto' }}>
                          <button
                            type="button"
                            className="btn-action-ghost"
                            title="Yukarı Taş"
                            disabled={rawIndex <= 0}
                            onClick={() => handleMoveActivity(rawIndex, rawIndex - 1)}
                            style={{ padding: '3px 8px', fontSize: '0.78rem', opacity: rawIndex <= 0 ? 0.35 : 1 }}
                          >
                            ⬆️ Yukarı
                          </button>
                          <button
                            type="button"
                            className="btn-action-ghost"
                            title="Aşağı Taş"
                            disabled={rawIndex >= rawActivities.length - 1}
                            onClick={() => handleMoveActivity(rawIndex, rawIndex + 1)}
                            style={{ padding: '3px 8px', fontSize: '0.78rem', opacity: rawIndex >= rawActivities.length - 1 ? 0.35 : 1 }}
                          >
                            ⬇️ Aşağı
                          </button>
                        </div>

                        <button type="button" className="btn-action-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleOpenEditActivity(act)}>
                          ✏️ Düzenle
                        </button>
                        <button type="button" className="btn-action-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }} onClick={() => handleDeleteActivity(act.id)}>
                          🗑️ Sil
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="panel panel-elevated" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Henüz aktivite kaydı eklenmemiş. Yukarıdaki butonla ilk görüşmeyi kaydedin.</p>
              </div>
            )}
          </div>
        );

      case 'teklifler':
        return <CustomerOffersTab customer={customer} setCustomers={setCustomers} />;

      case 'sozlesmeler':
        return <CustomerContractsTab customer={customer} setCustomers={setCustomers} />;

      case 'dokumanlar':
        return <CustomerDocumentsTab customer={customer} />;
    }
  };

  // --- RENDER CUSTOMER DETAIL VIEW ---
  if (selectedCustomer && selectedCustomerName) {
    const autoStatutory = calculateIsgStatutoryHours(selectedCustomer.employeeCount || 0, selectedCustomer.hazardClass || 'Tehlikeli');

    return (
      <section className="panel panel-wide panel-elevated customer-detail-page">
        {/* REQ 4: ACCENT-MATCHING EXECUTIVE COMMAND BANNER */}
        <div style={{
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
        }}>
          {/* TOP ROW: ALL CONTROLS IN PERFECT PIXEL-PERFECT ALIGNMENT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            
            {/* LEFT: BRANDING & CONTROL PILLS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              
              {/* COMPANY LOGO & SELECTOR */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  🏢
                </div>

                <select
                  value={selectedCustomer.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    if (newName) {
                      setSelectedCustomerName(newName);
                    }
                  }}
                  style={{
                    height: 38,
                    fontSize: '1.02rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    background: 'rgba(255, 255, 255, 0.25)',
                    border: '1.5px solid rgba(255, 255, 255, 0.45)',
                    borderRadius: 10,
                    padding: '0 14px',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    boxSizing: 'border-box',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: '38px'
                  }}
                  title="Firma Değiştir"
                >
                  {customers.map((c) => (
                    <option
                      key={c.id || c.name}
                      value={c.name}
                      style={{ background: 'var(--surface-strong)', color: 'var(--text-main)', fontWeight: 600 }}
                    >
                      🏢 {c.name} ({c.hazardClass} • {c.employeeCount} Personel)
                    </option>
                  ))}
                </select>
              </div>

              {/* MÜŞTERİ DURUMU DROPDOWN PILL */}
              <div style={{
                height: 38,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.25)',
                border: '1.5px solid rgba(255, 255, 255, 0.45)',
                borderRadius: 10,
                padding: '0 14px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                boxSizing: 'border-box'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: selectedCustomer.status === 'Aktif' ? '#34d399' : selectedCustomer.status === 'Kaybedildi' ? '#f87171' : '#fbbf24',
                  boxShadow: `0 0 10px ${selectedCustomer.status === 'Aktif' ? '#34d399' : selectedCustomer.status === 'Kaybedildi' ? '#f87171' : '#fbbf24'}`
                }}></span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.9)' }}>Durum:</span>
                <select
                  value={selectedCustomer.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setCustomers((prev) =>
                      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, status: newStatus } : c))
                    );
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: selectedCustomer.status === 'Aktif' ? '#6ee7b7' : selectedCustomer.status === 'Kaybedildi' ? '#fca5a5' : '#fde047',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    outline: 'none',
                    padding: 0
                  }}
                >
                  {leadStatusOptions.map((st) => (
                    <option key={st} value={st} style={{ background: 'var(--surface-strong)', color: 'var(--text-main)' }}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* CRM SATIŞ AŞAMASI DROPDOWN PILL */}
              <div style={{
                height: 38,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.25)',
                border: '1.5px solid rgba(255, 255, 255, 0.45)',
                borderRadius: 10,
                padding: '0 14px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '0.9rem' }}>📈</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.9)' }}>CRM Aşama:</span>
                <select
                  value={selectedCustomer.stage || 'Yeni Kayıt'}
                  onChange={(e) => {
                    const newStage = e.target.value;
                    setCustomers((prev) =>
                      prev.map((c) => (c.name === selectedCustomer.name ? { ...c, stage: newStage } : c))
                    );
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a5b4fc',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    outline: 'none',
                    padding: 0
                  }}
                >
                  {stageOptions.map((stg) => (
                    <option key={stg} value={stg} style={{ background: 'var(--surface-strong)', color: 'var(--text-main)' }}>
                      {stg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* RIGHT: BACK BUTTON */}
            <div>
              <button
                type="button"
                onClick={() => setSelectedCustomerName(null)}
                style={{
                  height: 38,
                  padding: '0 16px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.28)',
                  border: '1.5px solid rgba(255, 255, 255, 0.55)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  boxSizing: 'border-box',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                ← Müşteri Listesine Dön
              </button>
            </div>
          </div>

          {/* BOTTOM ROW: HIGH-CONTRAST STAT CHIPS */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.25)', paddingTop: 12, fontSize: '0.82rem' }}>
            
            {/* TEHLİKE SINIFI & SEKTÖR CHIP */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 10,
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
            }}>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: selectedCustomer.hazardClass === 'Çok Tehlikeli' ? 'rgba(239, 68, 68, 0.35)' : selectedCustomer.hazardClass === 'Tehlikeli' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)',
                  color: selectedCustomer.hazardClass === 'Çok Tehlikeli' ? '#fca5a5' : selectedCustomer.hazardClass === 'Tehlikeli' ? '#fde047' : '#6ee7b7'
                }}
              >
                ⚠️ {selectedCustomer.hazardClass}
              </span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>{selectedCustomer.sector}</span>
            </div>

            {/* KADRO & ENGELLİ CHIP */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 10,
              padding: '5px 12px',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
            }}>
              👥 <strong style={{ color: '#ffffff' }}>{selectedCustomer.employeeCount}</strong> Personel
              {selectedCustomer.disabledEmployeeCount ? (
                <span style={{ color: '#7dd3fc', marginLeft: 6, fontWeight: 700 }}>
                  (♿ {selectedCustomer.disabledEmployeeCount} Engelli)
                </span>
              ) : null}
            </div>

            {/* YASAL SÜRELER CHIP */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 10,
              padding: '5px 12px',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
            }}>
              ⏱️ Yasal Süre: <strong style={{ color: '#6ee7b7' }}>{autoStatutory.expertHours} Sa/Ay Uzman</strong> • <strong style={{ color: '#7dd3fc' }}>{autoStatutory.doctorHours} Sa/Ay Hekim</strong>
            </div>

            {/* LOKASYON CHIP */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 10,
              padding: '5px 12px',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
            }}>
              📍 <strong style={{ color: '#ffffff' }}>{selectedCustomer.city} / {selectedCustomer.district}</strong>
            </div>

            {/* VERGİ NO & KAYNAK CHIP */}
            {selectedCustomer.taxNo && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.22)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: 10,
                padding: '5px 12px',
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)'
              }}>
                📋 VN: <strong style={{ color: '#ffffff' }}>{selectedCustomer.taxNo}</strong>
                {selectedCustomer.leadSource ? <span style={{ color: '#c084fc', marginLeft: 8, fontWeight: 700 }}>🎯 {selectedCustomer.leadSource}</span> : null}
              </div>
            )}
          </div>
        </div>

        {/* FIXED BROWSER TAB BAR CONTAINER */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 16
          }}
        >
          {/* TOP TAB TRACK (FIXED, NO SCROLLBAR, NO DOTS) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 4,
              padding: '6px 12px 0 12px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* BROWSER TABS */}
            {customerTabs.map((tab) => {
              const isActive = activeTab === tab.id;

              let countBadge: number | null = null;
              if (tab.id === 'iletisim-kisileri') countBadge = (selectedCustomer.contactsList || []).length;
              if (tab.id === 'aktiviteler') countBadge = (selectedCustomer.activitiesList || []).length;
              if (tab.id === 'teklifler') countBadge = (selectedCustomer.offers || []).length;
              if (tab.id === 'sozlesmeler') countBadge = (selectedCustomer.contracts || []).length;
              if (tab.id === 'dokumanlar') {
                try {
                  const stored = localStorage.getItem('crm_documents_v2');
                  const allDocsList: DocumentRecord[] = stored ? JSON.parse(stored) : documentSeeds;
                  countBadge = allDocsList.filter((d) => d.customerName?.trim().toLowerCase() === selectedCustomer.name.trim().toLowerCase()).length;
                } catch (e) {
                  countBadge = 0;
                }
              }

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    height: '42px',
                    boxSizing: 'border-box',
                    fontSize: '0.86rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                    background: isActive ? 'var(--surface-strong)' : 'transparent',
                    borderLeft: isActive ? '1px solid var(--border)' : '1px solid transparent',
                    borderRight: isActive ? '1px solid var(--border)' : '1px solid transparent',
                    borderTop: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    borderBottom: isActive ? '1px solid var(--surface-strong)' : '1px solid transparent',
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                    marginBottom: -1,
                    zIndex: isActive ? 3 : 1,
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <span style={{ fontSize: '0.95rem' }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {countBadge !== null && countBadge > 0 && (
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 12,
                        background: isActive ? 'var(--accent-soft)' : 'var(--border)',
                        color: isActive ? 'var(--accent)' : 'var(--text-muted)'
                      }}
                    >
                      {countBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT PANEL */}
          <div
            style={{
              background: 'var(--surface-strong)',
              border: '1px solid var(--border)',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
              padding: '22px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              zIndex: 2
            }}
          >
            {renderDetailTab(selectedCustomer)}
          </div>
        </div>

        {/* MODAL FOR ADDING / EDITING CONTACT */}
        {contactModalOpen &&
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
                alignItems: 'flex-start',
                paddingTop: '60px',
                paddingBottom: '40px',
                overflowY: 'auto'
              }}
              onClick={() => setContactModalOpen(false)}
            >
              <div
                style={{
                  maxWidth: 580,
                  width: '100%',
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '20px',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* MODAL HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>👤</span>
                    <div>
                      <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', fontWeight: 700, display: 'block' }}>
                        {editingContact ? 'Düzenleme Modu' : 'Yeni Kayıt'}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                        {editingContact ? 'İletişim Kişisini Güncelle' : 'Yeni İletişim Kişisi Ekle'}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-action-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.84rem' }}
                    onClick={() => setContactModalOpen(false)}
                  >
                    ✕ Kapat
                  </button>
                </div>

                {/* MODAL FORM BODY */}
                <form onSubmit={handleSaveContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label className="select-field">
                      <span>Ad Soyad *</span>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Selin Aras"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      />
                    </label>

                    <label className="select-field">
                      <span>Unvan / Görev *</span>
                      <input
                        type="text"
                        required
                        placeholder="Örn: İK Müdürü, İSG Sorumlusu"
                        value={contactForm.title}
                        onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label className="select-field">
                      <span>E-posta Adresi</span>
                      <input
                        type="email"
                        placeholder="selin@firma.com"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                      <label className="select-field">
                        <span>Telefon</span>
                        <input
                          type="text"
                          placeholder="0532 111 22 33"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        />
                      </label>

                      <label className="select-field">
                        <span>Dahili</span>
                        <input
                          type="text"
                          placeholder="101"
                          value={contactForm.extension}
                          onChange={(e) => setContactForm({ ...contactForm, extension: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>

                  {/* MULTI-SELECT ROLES SELECTION */}
                  <div className="select-field">
                    <span style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>
                      Roller (birden fazla seçebilirsiniz)
                    </span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {contactRoleOptions.map((rOpt) => {
                        const isSelected = (contactForm.roles || []).includes(rOpt.value);
                        return (
                          <button
                            key={rOpt.value}
                            type="button"
                            onClick={() => {
                              const currentRoles = contactForm.roles || [];
                              let newRoles: string[];
                              if (isSelected) {
                                newRoles = currentRoles.filter((r) => r !== rOpt.value);
                              } else {
                                newRoles = [...currentRoles, rOpt.value];
                              }
                              const hasPrimary = newRoles.includes('primary');
                              setContactForm({
                                ...contactForm,
                                roles: newRoles,
                                isPrimary: hasPrimary
                              });
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '7px 14px',
                              borderRadius: 8,
                              fontSize: '0.84rem',
                              fontWeight: isSelected ? 700 : 500,
                              border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                              background: isSelected ? 'var(--accent-soft)' : 'var(--surface-strong)',
                              color: isSelected ? 'var(--accent)' : 'var(--text-main)',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.14)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>{rOpt.icon}</span>
                            <span>{rOpt.label}</span>
                            {isSelected && <span style={{ fontWeight: 800 }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* STYLED CHECKBOX BOX */}
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      id="isPrimaryCheckbox"
                      checked={contactForm.isPrimary}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const currentRoles = contactForm.roles || [];
                        let newRoles = [...currentRoles];
                        if (checked && !newRoles.includes('primary')) {
                          newRoles.push('primary');
                        } else if (!checked && newRoles.includes('primary')) {
                          newRoles = newRoles.filter((r) => r !== 'primary');
                        }
                        setContactForm({ ...contactForm, isPrimary: checked, roles: newRoles });
                      }}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                    <label htmlFor="isPrimaryCheckbox" style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      ⭐ Bu kişi firmanın birincil yetkili temsilcisidir
                    </label>
                  </div>

                  <label className="select-field">
                    <span>İletişim Notları</span>
                    <textarea
                      rows={3}
                      placeholder="Kişi hakkında özel iletişim notları..."
                      value={contactForm.notes}
                      onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                    />
                  </label>

                  {/* MODAL FOOTER */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
                    <button type="button" className="secondary-action" onClick={() => setContactModalOpen(false)} style={{ padding: '8px 18px' }}>
                      İptal
                    </button>
                    <button type="submit" className="btn-action-primary" style={{ padding: '8px 22px' }}>
                      {editingContact ? '💾 Güncellemeleri Kaydet' : '➕ Kişiyi Kaydet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* MODAL FOR ADDING / EDITING ACTIVITY */}
        {activityModalOpen &&
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
                alignItems: 'flex-start',
                paddingTop: '60px',
                paddingBottom: '40px',
                overflowY: 'auto'
              }}
              onClick={() => setActivityModalOpen(false)}
            >
              <div
                style={{
                  maxWidth: 640,
                  width: '100%',
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '20px',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* MODAL HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>📅</span>
                    <div>
                      <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', fontWeight: 700, display: 'block' }}>
                        {editingActivity ? 'Düzenleme Modu' : 'Yeni Aktivite'}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                        {editingActivity ? 'Aktivite Kaydını Güncelle' : 'Yeni Görüşme & Aktivite Ekle'}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-action-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.84rem' }}
                    onClick={() => setActivityModalOpen(false)}
                  >
                    ✕ Kapat
                  </button>
                </div>

                {/* MODAL FORM BODY */}
                <form onSubmit={handleSaveActivitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label className="select-field">
                      <span>Aktivite Tipi *</span>
                      <select
                        value={activityForm.type}
                        onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as CustomerActivity['type'] })}
                      >
                        <option value="Telefon">📞 Telefon Görüşmesi</option>
                        <option value="Toplantı">🤝 Toplantı</option>
                        <option value="E-posta">✉️ E-posta</option>
                        <option value="WhatsApp">💬 WhatsApp</option>
                        <option value="Ziyaret">🚗 Saha Ziyareti</option>
                        <option value="Demo">💻 Demo</option>
                        <option value="Sunum">📊 Sunum</option>
                        <option value="Not">📌 Not</option>
                      </select>
                    </label>

                    <label className="select-field">
                      <span>Aktivite Durumu *</span>
                      <select
                        value={activityForm.status}
                        onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value as CustomerActivity['status'] })}
                      >
                        <option value="Planlandı">Planlandı</option>
                        <option value="Tamamlandı">Tamamlandı</option>
                        <option value="İptal Edildi">İptal Edildi</option>
                      </select>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <label className="select-field">
                      <span>Tarih *</span>
                      <input
                        type="date"
                        required
                        value={activityForm.date}
                        onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                      />
                    </label>

                    <label className="select-field">
                      <span>Saat</span>
                      <input
                        type="time"
                        value={activityForm.time}
                        onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
                      />
                    </label>

                    <label className="select-field">
                      <span>⏰ Hatırlatıcı Kur</span>
                      <select
                        value={activityForm.reminderOffset}
                        onChange={(e) => setActivityForm({ ...activityForm, reminderOffset: e.target.value as any })}
                      >
                        <option value="15m">⏰ 15 Dakika Önce</option>
                        <option value="at_time">⏱️ Tam Saatinde</option>
                        <option value="30m">⏰ 30 Dakika Önce</option>
                        <option value="1h">⏳ 1 Saat Önce</option>
                        <option value="1d">📅 1 Gün Önce</option>
                        <option value="none">🚫 Hatırlatma Yapma</option>
                      </select>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label className="select-field">
                      <span>Aktiviteyi Gerçekleştiren Personel / Uzman *</span>
                      <select
                        required
                        value={activityForm.performedBy}
                        onChange={(e) => setActivityForm({ ...activityForm, performedBy: e.target.value })}
                      >
                        <option value="">-- Personel / Uzman Seçiniz --</option>
                        {tenantUsers.map((usr) => {
                          const optionValue = `${usr.name} (${usr.role})`;
                          return (
                            <option key={usr.id || usr.name} value={optionValue}>
                              👔 {optionValue}
                            </option>
                          );
                        })}
                        {selectedCustomer?.owner && !tenantUsers.some(u => u.name === selectedCustomer.owner) && (
                          <option value={`${selectedCustomer.owner} (Portföy Yöneticisi)`}>
                            👔 {selectedCustomer.owner} (Portföy Yöneticisi)
                          </option>
                        )}
                      </select>
                    </label>

                    <label className="select-field">
                      <span>Görüşülen İletişim Kişisi (Müşteri)</span>
                      <select
                        value={activityForm.contactPerson}
                        onChange={(e) => setActivityForm({ ...activityForm, contactPerson: e.target.value })}
                      >
                        <option value="">-- İletişim Kişisi Seçiniz --</option>
                        {(() => {
                          const contactOpts: Array<{ value: string; label: string }> = [];
                          const addedNames = new Set<string>();

                          // First add contacts from contactsList
                          (selectedCustomer?.contactsList || []).forEach((ct) => {
                            const valStr = `${ct.name}${ct.title ? ` (${ct.title})` : ''}`;
                            const cleanName = ct.name.trim().toLowerCase();
                            if (!addedNames.has(cleanName)) {
                              addedNames.add(cleanName);
                              contactOpts.push({
                                value: valStr,
                                label: `👤 ${ct.name}${ct.title ? ` (${ct.title})` : ''}${ct.isPrimary ? ' ⭐ Birincil' : ''}`
                              });
                            }
                          });

                          // Then add legacy selectedCustomer.contact if not already added
                          if (selectedCustomer?.contact) {
                            const rawContact = selectedCustomer.contact;
                            const primaryContactName = rawContact.split('(')[0].trim().toLowerCase();
                            if (!addedNames.has(primaryContactName)) {
                              addedNames.add(primaryContactName);
                              contactOpts.push({
                                value: rawContact,
                                label: `⭐ ${rawContact} (Ana Temsilci)`
                              });
                            }
                          }

                          return (
                            <>
                              {contactOpts.map((opt, idx) => (
                                <option key={idx} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                              <option value="Diğer / Genel İletişim">Diğer / Genel İletişim</option>
                            </>
                          );
                        })()}
                      </select>
                    </label>
                  </div>

                  <label className="select-field">
                    <span>Aktivite Başlığı / Konu *</span>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Hizmet Teklifi Sunumu ve Demo Gösterimi"
                      value={activityForm.subject}
                      onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
                    />
                  </label>

                  <label className="select-field">
                    <span>Görüşme & Aktivite Özeti (Opsiyonel)</span>
                    <textarea
                      rows={3}
                      placeholder="Görüşülen detaylar, sunum/demo notları ve sahadaki tespitler..."
                      value={activityForm.summary}
                      onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })}
                    />
                  </label>

                  <label className="select-field">
                    <span>Takip / Aksiyon Notu</span>
                    <input
                      type="text"
                      placeholder="Örn: Haftaya teklif revizyonu iletilecek."
                      value={activityForm.actionNote}
                      onChange={(e) => setActivityForm({ ...activityForm, actionNote: e.target.value })}
                    />
                  </label>

                  {/* FILE ATTACHMENT FIELD */}
                  <div className="select-field">
                    <span>📎 Ekli Dosya / Doküman (PDF, Word, Excel, Görsel vb.)</span>
                    {activityForm.fileName ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                          <span style={{ fontSize: '1.25rem' }}>📄</span>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {activityForm.fileName}
                            </strong>
                            {activityForm.fileSize && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activityForm.fileSize}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ color: '#ef4444', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600 }}
                          onClick={() => setActivityForm((prev) => ({ ...prev, fileName: undefined, fileDataUrl: undefined, fileSize: undefined }))}
                        >
                          ✕ Dosyayı Kaldır
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                              const dataUrl = evt.target?.result as string;
                              const kb = (file.size / 1024).toFixed(1);
                              setActivityForm((prev) => ({
                                ...prev,
                                fileName: file.name,
                                fileDataUrl: dataUrl,
                                fileSize: `${kb} KB`
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ padding: '8px 12px', fontSize: '0.84rem', cursor: 'pointer' }}
                      />
                    )}
                  </div>

                  {/* MODAL FOOTER */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
                    <button type="button" className="secondary-action" onClick={() => setActivityModalOpen(false)} style={{ padding: '8px 18px' }}>
                      İptal
                    </button>
                    <button type="submit" className="btn-action-primary" style={{ padding: '8px 22px' }}>
                      {editingActivity ? '💾 Güncellemeleri Kaydet' : '➕ Aktiviteyi Kaydet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        }
      </section>
    );
  }

  // --- RENDER CUSTOMERS LIST VIEW ---
  return (
    <section className="panel panel-wide panel-elevated page-layout page-layout-customers">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Müşteri CRM Portföyü</p>
          <h3>Müşteri Listesi & Firma Detayları</h3>
        </div>
        <span className="mini-badge">{filteredCustomers.length} kayıt</span>
      </div>

      {isLoadingBackend ? <p className="form-hint">Backend verileri yükleniyor...</p> : null}

      <div className="customer-create-header">
        <button
          type="button"
          className={isCreateOpen ? 'new-customer-toggle new-customer-toggle-active' : 'new-customer-toggle'}
          onClick={() => {
            setIsCreateOpen((current) => !current);
            setFormHint('');
            setFormErrors({});
          }}
        >
          {isCreateOpen ? '− Yeni Müşteri Formunu Kapat' : '+ Yeni Müşteri Ekle'}
        </button>
      </div>

      {isCreateOpen && (
        <section className="new-customer-form panel panel-elevated">
          <div className="new-customer-grid">
            <label className="select-field new-customer-full">
              <span>Firma Adı *</span>
              <input
                type="text"
                placeholder="Örn: Akdeniz OSGB A.Ş."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label className="select-field">
              <span>Sorumlu</span>
              <select
                value={form.owner || ''}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              >
                <option value="">Atanmadı</option>
                {tenantUsers.map((u, i) => (
                  <option key={i} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <span>Vergi Numarası</span>
              <input
                type="text"
                placeholder="10 haneli VKN"
                value={form.taxNo}
                onChange={(e) => setForm({ ...form, taxNo: e.target.value })}
              />
            </label>

            <label className="select-field">
              <span>Vergi Dairesi</span>
              <input
                type="text"
                placeholder="Örn: Kadıköy VD"
                value={form.taxOffice}
                onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
              />
            </label>

            <label className="select-field">
              <span>Sektör</span>
              <input
                type="text"
                placeholder="Örn: Kimya Üretimi"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
              />
            </label>

            <label className="select-field" style={{ position: 'relative' }}>
              <span>NACE Kodu & Faaliyet Tanımı</span>
              <input
                type="text"
                placeholder="NACE kodu veya arama terimi (örn: 28.11, depolama, metal)..."
                value={form.naceCode}
                onFocus={() => setIsNewNaceFocused(true)}
                onBlur={() => setTimeout(() => setIsNewNaceFocused(false), 200)}
                onChange={(e) => {
                  setForm({ ...form, naceCode: e.target.value });
                  setIsNewNaceFocused(true);
                }}
              />
              {form.naceCode && (
                <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, display: 'block', marginTop: 2 }}>
                  💡 Tanım:{' '}
                  {comprehensiveNaceList.find((n) => n.nace_code === form.naceCode)?.description ||
                    'Özel NACE Kodu'}
                </span>
              )}

              {/* LIVE ACCESSIBLE NACE DROPDOWN */}
              {isNewNaceFocused && form.naceCode && searchNaceCodes(form.naceCode).length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 2px)',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: 'var(--surface-strong)',
                    border: '2px solid var(--accent)',
                    borderRadius: '12px',
                    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.55)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '6px'
                  }}
                >
                  {searchNaceCodes(form.naceCode).map((item) => (
                    <div
                      key={item.nace_code}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm({
                          ...form,
                          naceCode: item.nace_code,
                          hazardClass: item.danger_class
                        });
                        setIsNewNaceFocused(false);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-soft)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--accent)' }}>{item.nace_code}</strong>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: item.danger_class === 'Çok Tehlikeli' ? 'rgba(239, 68, 68, 0.15)' : item.danger_class === 'Tehlikeli' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: item.danger_class === 'Çok Tehlikeli' ? '#ef4444' : item.danger_class === 'Tehlikeli' ? '#f59e0b' : '#10b981'
                          }}
                        >
                          ● {item.danger_class}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block' }}>{item.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </label>

            <label className="select-field">
              <span>Tehlike Sınıfı</span>
              <select
                value={form.hazardClass}
                onChange={(e) => setForm({ ...form, hazardClass: e.target.value })}
              >
                <option value="">Seçiniz</option>
                {hazardClassOptions.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <span>Çalışan Sayısı</span>
              <input
                type="number"
                placeholder="Örn: 250"
                value={form.employeeCount}
                onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
              />
            </label>

            <label className="select-field">
              <span>♿ Engelli Çalışan Sayısı</span>
              <input
                type="number"
                placeholder="Örn: 12"
                value={form.disabledEmployeeCount}
                onChange={(e) => setForm({ ...form, disabledEmployeeCount: e.target.value })}
              />
            </label>

            <label className="select-field">
              <span>Şehir (İl)</span>
              <select
                value={form.city}
                onChange={(e) => {
                  const selectedCity = e.target.value;
                  const availableDistricts = getDistrictsForCity(selectedCity);
                  setForm({
                    ...form,
                    city: selectedCity,
                    district: availableDistricts[0] || ''
                  });
                }}
              >
                <option value="">Seçiniz</option>
                {turkeyCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <span>İlçe</span>
              <select
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                disabled={!form.city}
              >
                <option value="">{form.city ? 'İlçe Seçiniz' : '-- Önce Şehir Seçiniz --'}</option>
                {getDistrictsForCity(form.city).map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="new-customer-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setIsCreateOpen(false);
                setForm(defaultForm);
              }}
            >
              İptal
            </button>

            <button
              type="button"
              className="btn-action-primary"
              onClick={() => {
                if (!form.name.trim()) return;

                const newCustObj: CustomerRecord = {
                  id: `cust-${Date.now()}`,
                  name: form.name,
                  status: form.status || 'Teklif Bekliyor',
                  stage: form.stage || 'Yeni Kayıt',
                  owner: form.owner || 'Atanmadı',
                  city: form.city || '-',
                  district: form.district || '-',
                  hazardClass: form.hazardClass || 'Tehlikeli',
                  sector: form.sector || 'Genel',
                  employeeCount: Number(form.employeeCount) || 0,
                  disabledEmployeeCount: Number(form.disabledEmployeeCount) || 0,
                  specialGroupsNotes: form.specialGroupsNotes,
                  taxNo: form.taxNo,
                  taxOffice: form.taxOffice,
                  naceCode: form.naceCode,
                  website: form.website,
                  address: form.address,
                  requestedServices: ['İSG Uzmanı Hizmeti', 'İşyeri Hekimi Hizmeti'],
                  visitFrequency: 'Aylık',
                  contactsList: [],
                  activitiesList: [],
                  offers: [],
                  contracts: []
                };

                setCustomers((prev) => [newCustObj, ...prev]);
                setIsCreateOpen(false);
                setForm(defaultForm);
                setSelectedCustomerName(newCustObj.name);
              }}
            >
              Müşteriyi Kaydet ve Aç
            </button>
          </div>
        </section>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="customer-filter-grid">
        <label className="search-field customer-search-field">
          <span>Arama</span>
          <input
            type="text"
            placeholder="Firma adı, sorumlu, şehir, NACE kodu ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <label className="select-field">
          <span>Durum</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <span>Şehir</span>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            {cityOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <span>İlçe</span>
          <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}>
            {districtOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <span>Tehlike</span>
          <select value={hazardFilter} onChange={(e) => setHazardFilter(e.target.value)}>
            {hazardOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <span>Sektör</span>
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
            {sectorOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      </div>

      {/* CUSTOMERS TABLE */}
      <div className="customer-table-wrap">
        <table className="customer-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="table-sort-button" onClick={() => handleSort('name')}>
                  <span>Firma {sortIcon('name')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="table-sort-button" onClick={() => handleSort('status')}>
                  <span>Durum & Aşama {sortIcon('status')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="table-sort-button" onClick={() => handleSort('location')}>
                  <span>Şehir / İlçe {sortIcon('location')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="table-sort-button" onClick={() => handleSort('hazardClass')}>
                  <span>Tehlike {sortIcon('hazardClass')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="table-sort-button" onClick={() => handleSort('sector')}>
                  <span>Sektör {sortIcon('sector')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="table-sort-button" onClick={() => handleSort('employeeCount')}>
                  <span>Çalışan Sayısı {sortIcon('employeeCount')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="table-sort-button" onClick={() => handleSort('owner')}>
                  <span>Sorumlu {sortIcon('owner')}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.length > 0 ? (
              sortedCustomers.map((customer) => (
                <tr
                  key={customer.name}
                  className={selectedCustomerName === customer.name ? 'customer-table-row customer-table-row-active' : 'customer-table-row'}
                  onClick={() => setSelectedCustomerName(customer.name)}
                >
                  <td>
                    <strong style={{ fontSize: '0.96rem' }}>{customer.name}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{customer.contact || customer.contactsList?.[0]?.name || 'İletişim yok'}</span>
                  </td>
                  <td>
                    <span className="mini-badge" style={{ background: customer.status === 'Aktif' ? 'rgba(16, 185, 129, 0.16)' : customer.status === 'Kaybedildi' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(245, 158, 11, 0.16)', color: customer.status === 'Aktif' ? '#10b981' : customer.status === 'Kaybedildi' ? '#ef4444' : '#f59e0b', border: 'none', fontWeight: 600 }}>
                      ● {customer.status}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>{customer.stage || 'Yeni Kayıt'}</span>
                  </td>
                  <td>
                    <strong>{customer.city}</strong>
                    <span>{customer.district}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{customer.hazardClass}</span>
                  </td>
                  <td>
                    <span>{customer.sector}</span>
                  </td>
                  <td>
                    <strong>{customer.employeeCount}</strong>
                  </td>
                  <td>
                    <strong>{customer.owner}</strong>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="customer-table-empty">
                  Aradığınız kriterlere uygun müşteri kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
