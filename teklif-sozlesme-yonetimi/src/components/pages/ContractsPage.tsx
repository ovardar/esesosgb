import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CustomerRecord, calculateIsgStatutoryHours } from './CustomersPage';
import { PriceRule } from './PriceListsPage';
import {
  ContractRecord,
  ContractRevision,
  ContractServiceLine,
  ContractStage,
  PaymentMethod,
  PaymentTerms,
  AcceptanceChannel,
  RenewalPeriod,
  OfferRecord,
  VatMode,
  SaaSTenant
} from '../../types';
import { contractSeeds } from '../../data/contractSeeds';
import { offerSeeds } from '../../data/workbench';
import { ContractPdfPreviewModal } from '../modals/PdfPreviewModals';
import { ContractRevisionDiffView } from '../ContractRevisionDiffView';

const LOCAL_STORAGE_KEY_PRICE_RULES = 'crm_price_list_v2';

const stageBadges: Record<ContractStage, { bg: string; color: string; label: string }> = {
  'Taslak': { bg: 'rgba(148, 163, 184, 0.16)', color: '#64748b', label: '📝 Taslak' },
  'Onay Bekliyor': { bg: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', label: '⏳ Onay Bekliyor' },
  'Aktif': { bg: 'rgba(16, 185, 129, 0.16)', color: '#10b981', label: '✅ Aktif' },
  'Revizyonda': { bg: 'rgba(99, 102, 241, 0.16)', color: '#6366f1', label: '🔄 Revizyonda' },
  'Yenilenecek': { bg: 'rgba(236, 72, 153, 0.16)', color: '#ec4899', label: '⏰ Yenilenecek' },
  'Süresi Doldu': { bg: 'rgba(239, 68, 68, 0.16)', color: '#ef4444', label: '🛑 Süresi Doldu' },
  'Feshedildi': { bg: 'rgba(71, 85, 105, 0.2)', color: '#475569', label: '✕ Feshedildi' }
};

// Staff Personnel Lists with userType (💻 Sistem Kullanıcısı vs 📋 Saha Kadrosu)
const isgExpertsList = [
  { name: 'Ayşe Yılmaz (A Sınıfı İSG Uzmanı)', role: 'A Sınıfı İSG Uzmanı', userType: '💻 Sistem Kullanıcısı' },
  { name: 'Mert Demir (B Sınıfı İSG Uzmanı)', role: 'B Sınıfı İSG Uzmanı', userType: '💻 Sistem Kullanıcısı' },
  { name: 'Elif Kaya (A Sınıfı İSG Uzmanı)', role: 'A Sınıfı İSG Uzmanı', userType: '📋 Saha Kadrosu' },
  { name: 'Ahmet Can (B Sınıfı İSG Uzmanı)', role: 'B Sınıfı İSG Uzmanı', userType: '📋 Saha Kadrosu' },
  { name: 'Mustafa Şahin (C Sınıfı İSG Uzmanı)', role: 'C Sınıfı İSG Uzmanı', userType: '📋 Saha Kadrosu' }
];

const workplaceDoctorsList = [
  { name: 'Dr. Mehmet Öz (İşyeri Hekimi)', role: 'İşyeri Hekimi', userType: '📋 Saha Kadrosu' },
  { name: 'Dr. Zeynep Erdem (İşyeri Hekimi)', role: 'İşyeri Hekimi', userType: '💻 Sistem Kullanıcısı' },
  { name: 'Dr. Selim Koç (İşyeri Hekimi)', role: 'İşyeri Hekimi', userType: '📋 Saha Kadrosu' },
  { name: 'Dr. Canan Taş (İşyeri Hekimi)', role: 'İşyeri Hekimi', userType: '💻 Sistem Kullanıcısı' }
];

const dspList = [
  { name: 'Hemşire Fatma Yıldız (DSP)', role: 'DSP', userType: '📋 Saha Kadrosu' },
  { name: 'Sağlık Memuru Ali Sunal (DSP)', role: 'DSP', userType: '📋 Saha Kadrosu' }
];

const unitOptions = ['Saat/Ay', 'Aylık', 'Adet', 'Kişi/Ay', 'Kişi/Dönem', 'Paket', 'Yıllık'];

type ContractSortKey = 'contractNo' | 'contractTitle' | 'customerName' | 'stage' | 'amount' | 'endDate' | 'assigned';

// Helper to calculate exact 1 year minus 1 day end date
const calculateDefaultEndDate = (startDateStr: string) => {
  if (!startDateStr) return '';
  const d = new Date(startDateStr);
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

// Safe financial calculator supporting KDV Dahil & KDV Hariç
const computeFinancials = (services: ContractServiceLine[], vatMode: VatMode = 'KDV Hariç') => {
  let subtotal = 0;
  let taxAmount = 0;
  let grandTotal = 0;

  if (vatMode === 'KDV Dahil') {
    let grossInclusive = 0;
    (services || []).forEach((s) => {
      grossInclusive += (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0);
    });

    (services || []).forEach((s) => {
      const lineInclusive = (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0);
      const kdvRate = (Number(s.kdvPercent) || 20) / 100;
      const lineNet = Math.round(lineInclusive / (1 + kdvRate));
      const lineTax = Math.round(lineInclusive - lineNet);
      subtotal += lineNet;
      taxAmount += lineTax;
    });

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
    grandTotal = Math.round(subtotal + taxAmount);
  }

  return { subtotal, discountTotal: 0, taxAmount, grandTotal };
};

interface ContractsPageProps {
  contracts?: ContractRecord[];
  setContracts?: React.Dispatch<React.SetStateAction<ContractRecord[]>>;
  customers?: CustomerRecord[];
  offers?: OfferRecord[];
  impersonatedTenant?: SaaSTenant | null;
}

export function ContractsPage({
  contracts: propsContracts,
  setContracts: propsSetContracts,
  customers = [],
  offers = offerSeeds,
  impersonatedTenant
}: ContractsPageProps) {
  // Local contracts state synced with props & localStorage for instant reactivity
  const [contracts, setContracts] = useState<ContractRecord[]>(() => {
    if (propsContracts && propsContracts.length > 0) return propsContracts;
    try {
      const stored = localStorage.getItem('crm_contracts_v3');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return contractSeeds;
  });

  useEffect(() => {
    if (propsContracts) {
      setContracts(propsContracts);
    }
  }, [propsContracts]);

  // Sync back helper
  const updateContractsState = (newContracts: ContractRecord[]) => {
    setContracts(newContracts);
    if (propsSetContracts) {
      propsSetContracts(newContracts);
    }
    try {
      localStorage.setItem('crm_contracts_v3', JSON.stringify(newContracts));
    } catch (e) {
      console.error(e);
    }
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('Tümü');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('Tümü');
  const [selectedRenewalFilter, setSelectedRenewalFilter] = useState<string>('Tümü');
  const [sortKey, setSortKey] = useState<ContractSortKey>('contractNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Active Modals & Selected Contract
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'services' | 'staff' | 'history'>('overview');

  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);

  // Price List Rules for adding lines
  const [priceRules] = useState<PriceRule[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PRICE_RULES);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const initialEndDateStr = calculateDefaultEndDate(todayStr);

  // --- NEW CONTRACT FORM STATE ---
  const [newContractForm, setNewContractForm] = useState<{
    contractTitle: string;
    customerName: string;
    linkedOfferId: string;
    stage: ContractStage;
    startDate: string;
    endDate: string;
    vatMode: VatMode;
    acceptanceChannel: AcceptanceChannel;
    acceptanceNotes: string;
    owner: string;
    assignedExpert: string;
    assignedDoctor: string;
    assignedDsp: string;
    isgKatipNo: string;
    paymentMethod: PaymentMethod;
    paymentTerms: PaymentTerms;
    billingCycle: 'Aylık' | '3 Aylık' | '6 Aylık' | 'Yıllık';
    autoRenew: boolean;
    services: ContractServiceLine[];
    notes: string;
  }>({
    contractTitle: '',
    customerName: customers.length > 0 ? customers[0].name : '',
    linkedOfferId: '',
    stage: 'Taslak', // Req b: Default stage is Taslak!
    startDate: todayStr,
    endDate: initialEndDateStr, // Req d: 1 year minus 1 day!
    vatMode: 'KDV Hariç',
    acceptanceChannel: 'Sözlü Onay (Telefon)',
    acceptanceNotes: '',
    owner: 'Ayşe Yılmaz',
    assignedExpert: '', // Req f: Empty default
    assignedDoctor: '', // Req f: Empty default
    assignedDsp: '',
    isgKatipNo: '', // Req e: Empty default
    paymentMethod: 'Banka Havalesi / EFT',
    paymentTerms: 'Aylık Düzenli Fatura',
    billingCycle: 'Aylık',
    autoRenew: true,
    services: [],
    notes: ''
  });

  // --- EDIT CONTRACT FORM STATE (Req e: Includes ALL fields!) ---
  const [editContractForm, setEditContractForm] = useState<{
    contractTitle: string;
    customerName: string;
    linkedOfferId: string;
    stage: ContractStage;
    startDate: string;
    endDate: string;
    vatMode: VatMode;
    acceptanceChannel: AcceptanceChannel;
    acceptanceNotes: string;
    assignedExpert: string;
    assignedDoctor: string;
    assignedDsp: string;
    isgKatipNo: string;
    paymentMethod: PaymentMethod;
    paymentTerms: PaymentTerms;
    billingCycle: 'Aylık' | '3 Aylık' | '6 Aylık' | 'Yıllık';
    autoRenew: boolean;
    services: ContractServiceLine[];
    notes: string;
    saveAsNewRevision: boolean;
    revisionNotes: string;
  }>({
    contractTitle: '',
    customerName: '',
    linkedOfferId: '',
    stage: 'Aktif',
    startDate: '',
    endDate: '',
    vatMode: 'KDV Hariç',
    acceptanceChannel: 'Sözlü Onay (Telefon)',
    acceptanceNotes: '',
    assignedExpert: '',
    assignedDoctor: '',
    assignedDsp: '',
    isgKatipNo: '',
    paymentMethod: 'Banka Havalesi / EFT',
    paymentTerms: 'Aylık Düzenli Fatura',
    billingCycle: 'Aylık',
    autoRenew: true,
    services: [],
    notes: '',
    saveAsNewRevision: false,
    revisionNotes: ''
  });

  // Service Line Input State inside modals (Req b & c: dropdown unit and reset on open)
  const [selectedPriceRuleId, setSelectedPriceRuleId] = useState<string>('');
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

  // Helper to reset manual line item state cleanly
  const resetCustomLineInput = () => {
    setCustomLineInput({
      serviceName: '',
      unit: 'Saat/Ay',
      quantity: 1,
      unitPrice: 0,
      kdvPercent: 20,
      renewalPeriod: 'Yıllık',
      nextRenewalDate: initialEndDateStr
    });
    setSelectedPriceRuleId('');
  };

  // Helper to filter & categorize offers for selected customer
  const getCategorizedOffersForCustomer = (targetCustomerName?: string) => {
    let list = offers;
    if (targetCustomerName) {
      const custOffers = offers.filter((o) => o.customerName === targetCustomerName);
      if (custOffers.length > 0) list = custOffers;
    }

    const activeOffers = list.filter((o) => o.status !== 'Kazanıldı' && o.status !== 'Kaybedildi');
    const completedOffers = list.filter((o) => o.status === 'Kazanıldı');
    const closedOffers = list.filter((o) => o.status === 'Kaybedildi');

    return { activeOffers, completedOffers, closedOffers };
  };

  // Req i: Filter price list rules strictly by selected customer's hazard class & employee count
  const getFilteredPriceRulesForCustomer = (targetCustomerName: string) => {
    const cust = customers.find((c) => c.name === targetCustomerName);
    if (!cust) return priceRules;

    const empCount = cust.employeeCount || 0;
    const hazard = cust.hazardClass;

    const matched = priceRules.filter((r) => {
      const hazardMatch = r.danger_class === hazard;
      const empMatch = empCount >= r.min_emp && (r.max_emp === null || r.max_emp === undefined || empCount <= r.max_emp);
      return hazardMatch && empMatch;
    });

    if (matched.length > 0) return matched;
    return priceRules.filter((r) => r.danger_class === hazard);
  };

  // Req a & h: Handle linked offer selection & auto-populate service lines
  const handleSelectLinkedOffer = (offerId: string, isEditMode = false) => {
    if (!offerId) {
      if (isEditMode) {
        setEditContractForm((prev) => ({ ...prev, linkedOfferId: '' }));
      } else {
        setNewContractForm((prev) => ({ ...prev, linkedOfferId: '', services: [] }));
      }
      return;
    }

    const selectedOff = offers.find((o) => o.id === offerId);
    if (!selectedOff) return;

    const activeRev = selectedOff.revisions[selectedOff.revisions.length - 1];
    const offerVatMode: VatMode = selectedOff.vatMode || activeRev?.vatMode || 'KDV Hariç';
    const mappedServices: ContractServiceLine[] = (activeRev ? activeRev.services : []).map((s) => ({
      ...s,
      renewalPeriod: s.renewalPeriod || 'Yıllık',
      nextRenewalDate: (isEditMode ? editContractForm.endDate : newContractForm.endDate) || calculateDefaultEndDate(todayStr)
    }));

    if (isEditMode) {
      setEditContractForm((prev) => ({
        ...prev,
        linkedOfferId: offerId,
        customerName: selectedOff.customerName,
        contractTitle: prev.contractTitle || `${selectedOff.customerName} - ${selectedOff.subject}`,
        vatMode: offerVatMode,
        services: mappedServices
      }));
    } else {
      setNewContractForm((prev) => ({
        ...prev,
        linkedOfferId: offerId,
        customerName: selectedOff.customerName,
        contractTitle: prev.contractTitle || `${selectedOff.customerName} - ${selectedOff.subject}`,
        vatMode: offerVatMode,
        services: mappedServices
      }));
    }
  };

  // Helper to validate duplicate contract names
  const checkDuplicateTitle = (title: string, excludeContractId?: string) => {
    if (!title || !title.trim()) return false;
    const cleanTitle = title.trim().toLowerCase();
    return contracts.some(
      (c) => c.id !== excludeContractId && c.contractTitle.trim().toLowerCase() === cleanTitle
    );
  };

  // Helper to compute line item renewal status badge
  const getLineRenewalStatus = (nextRenewalDate?: string) => {
    if (!nextRenewalDate) return { status: 'none', label: 'Tarih Yok', bg: 'rgba(148, 163, 184, 0.16)', color: '#64748b' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const renewDate = new Date(nextRenewalDate);
    const diffTime = renewDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: `🔴 Süresi ${Math.abs(diffDays)} Gün Geçti`, bg: 'rgba(239, 68, 68, 0.16)', color: '#ef4444' };
    } else if (diffDays <= 30) {
      return { status: 'warning', label: `🟡 ${diffDays} Gün Kaldı`, bg: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b' };
    } else {
      return { status: 'ok', label: `🟢 Güncel (${diffDays} Gün)`, bg: 'rgba(16, 185, 129, 0.16)', color: '#10b981' };
    }
  };

  // Evaluate line item renewal alerts across all active contracts
  const lineItemRenewalAlerts = useMemo(() => {
    const alerts: {
      contract: ContractRecord;
      service: ContractServiceLine;
      daysLeft: number;
    }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    contracts.forEach((c) => {
      if (c.stage === 'Aktif' || c.stage === 'Revizyonda' || c.stage === 'Onay Bekliyor') {
        const activeRev = c.revisions[c.revisions.length - 1];
        if (activeRev && activeRev.services) {
          activeRev.services.forEach((srv) => {
            if (srv.nextRenewalDate) {
              const rDate = new Date(srv.nextRenewalDate);
              const diffTime = rDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 30) {
                alerts.push({ contract: c, service: srv, daysLeft: diffDays });
              }
            }
          });
        }
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [contracts]);

  // Add line item from filtered price rules to current form list
  const handleAddPriceRuleLine = (
    customerName: string,
    currentLines: ContractServiceLine[],
    setLinesFn: (updated: ContractServiceLine[]) => void
  ) => {
    if (!selectedPriceRuleId) return;
    const rule = priceRules.find((r) => r.id === selectedPriceRuleId);
    if (!rule) return;

    const cust = customers.find((c) => c.name === customerName);
    const statutory = calculateIsgStatutoryHours(cust?.employeeCount || 0, cust?.hazardClass || 'Tehlikeli');
    let unit = 'Aylık';
    let qty = 1;
    const srv = rule.service_name;

    if (srv.includes('İSG Uzmanı') || srv.includes('Uzman')) {
      unit = 'Saat/Ay';
      qty = cust?.expertMonthlyHours ? Number(cust.expertMonthlyHours) : statutory.expertHours;
    } else if (srv.includes('Hekim')) {
      unit = 'Saat/Ay';
      qty = cust?.doctorMonthlyHours ? Number(cust.doctorMonthlyHours) : statutory.doctorHours;
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
      nextRenewalDate: newContractForm.endDate || initialEndDateStr
    };

    setLinesFn([...currentLines, newLine]);
    setSelectedPriceRuleId('');
  };

  // Add custom manual line item
  const handleAddCustomLine = (
    currentLines: ContractServiceLine[],
    setLinesFn: (updated: ContractServiceLine[]) => void
  ) => {
    if (!customLineInput.serviceName || !customLineInput.unitPrice) return;
    const lineTotal = Math.round(customLineInput.quantity * customLineInput.unitPrice);
    const newLine: ContractServiceLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serviceName: customLineInput.serviceName,
      unit: customLineInput.unit,
      quantity: Number(customLineInput.quantity),
      unitPrice: Number(customLineInput.unitPrice),
      kdvPercent: Number(customLineInput.kdvPercent),
      lineTotal,
      renewalPeriod: customLineInput.renewalPeriod,
      nextRenewalDate: customLineInput.nextRenewalDate
    };

    setLinesFn([...currentLines, newLine]);
    resetCustomLineInput(); // Req c: Reset manual fields after adding!
  };

  // Save New Standalone/Offer Contract
  const handleCreateContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (checkDuplicateTitle(newContractForm.contractTitle)) {
      alert(`⚠️ "${newContractForm.contractTitle}" isimli bir sözleşme zaten mevcut! Lütfen benzersiz bir takip adı belirleyin.`);
      return;
    }

    const linkedOff = offers.find((o) => o.id === newContractForm.linkedOfferId);

    const financials = computeFinancials(newContractForm.services, newContractForm.vatMode);
    const initialRev: ContractRevision = {
      revisionNo: 0,
      revisionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      preparedBy: newContractForm.owner,
      revisionNotes: linkedOff ? `Teklif (${linkedOff.offerNo}) üzerinden oluşturuldu.` : 'İlk sözleşme kaydı oluşturuldu.',
      contractTitle: newContractForm.contractTitle,
      startDate: newContractForm.startDate,
      endDate: newContractForm.endDate,
      assignedExpert: newContractForm.assignedExpert,
      assignedDoctor: newContractForm.assignedDoctor,
      assignedDsp: newContractForm.assignedDsp,
      isgKatipNo: newContractForm.isgKatipNo,
      paymentMethod: newContractForm.paymentMethod,
      paymentTerms: newContractForm.paymentTerms,
      autoRenew: newContractForm.autoRenew,
      services: newContractForm.services,
      vatMode: newContractForm.vatMode,
      ...financials
    };

    const newRecord: ContractRecord = {
      id: `cnt-rec-${Date.now()}`,
      contractNo: `SZL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      contractTitle: newContractForm.contractTitle,
      customerName: newContractForm.customerName,
      stage: newContractForm.stage,
      offerId: linkedOff?.id,
      offerNo: linkedOff?.offerNo,
      acceptanceChannel: newContractForm.acceptanceChannel,
      acceptanceNotes: newContractForm.acceptanceNotes,
      startDate: newContractForm.startDate,
      endDate: newContractForm.endDate,
      currentRevisionNo: 0,
      createdDate: new Date().toISOString().split('T')[0],
      owner: newContractForm.owner,
      vatMode: newContractForm.vatMode,
      assignedExpert: newContractForm.assignedExpert,
      assignedDoctor: newContractForm.assignedDoctor,
      assignedDsp: newContractForm.assignedDsp,
      isgKatipNo: newContractForm.isgKatipNo,
      paymentMethod: newContractForm.paymentMethod,
      paymentTerms: newContractForm.paymentTerms,
      billingCycle: newContractForm.billingCycle,
      autoRenew: newContractForm.autoRenew,
      notes: newContractForm.notes,
      revisions: [initialRev]
    };

    updateContractsState([newRecord, ...contracts]); // Req d: Immediate reactive update
    resetCustomLineInput();
    setCreateModalOpen(false);
  };

  // Open Edit Modal (Req e: Prefill ALL fields)
  const handleOpenEditModal = (cnt: ContractRecord) => {
    setSelectedContract(cnt);
    const activeRev = cnt.revisions[cnt.revisions.length - 1];

    setEditContractForm({
      contractTitle: cnt.contractTitle,
      customerName: cnt.customerName,
      linkedOfferId: cnt.offerId || '',
      stage: cnt.stage,
      startDate: cnt.startDate,
      endDate: cnt.endDate,
      vatMode: activeRev?.vatMode || cnt.vatMode || 'KDV Hariç',
      acceptanceChannel: cnt.acceptanceChannel || 'Sözlü Onay (Telefon)',
      acceptanceNotes: cnt.acceptanceNotes || '',
      assignedExpert: cnt.assignedExpert || '',
      assignedDoctor: cnt.assignedDoctor || '',
      assignedDsp: cnt.assignedDsp || '',
      isgKatipNo: cnt.isgKatipNo || '',
      paymentMethod: cnt.paymentMethod || 'Banka Havalesi / EFT',
      paymentTerms: cnt.paymentTerms || 'Aylık Düzenli Fatura',
      billingCycle: cnt.billingCycle || 'Aylık',
      autoRenew: cnt.autoRenew,
      services: JSON.parse(JSON.stringify(activeRev ? activeRev.services : [])),
      notes: cnt.notes || '',
      saveAsNewRevision: false,
      revisionNotes: ''
    });

    resetCustomLineInput();
    setEditModalOpen(true);
  };

  // Save Edit / Revision
  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    if (checkDuplicateTitle(editContractForm.contractTitle, selectedContract.id)) {
      alert(`⚠️ "${editContractForm.contractTitle}" takip adı başka bir sözleşmede kayıtlı! Lütfen farklı bir isim girin.`);
      return;
    }

    const linkedOff = offers.find((o) => o.id === editContractForm.linkedOfferId);
    const financials = computeFinancials(editContractForm.services, editContractForm.vatMode);

    if (editContractForm.saveAsNewRevision) {
      const nextRevNo = selectedContract.currentRevisionNo + 1;
      const newRev: ContractRevision = {
        revisionNo: nextRevNo,
        revisionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        preparedBy: selectedContract.owner,
        revisionNotes: editContractForm.revisionNotes || `Revizyon ${nextRevNo} (Sözleşme Güncellemesi)`,
        contractTitle: editContractForm.contractTitle,
        startDate: editContractForm.startDate,
        endDate: editContractForm.endDate,
        assignedExpert: editContractForm.assignedExpert,
        assignedDoctor: editContractForm.assignedDoctor,
        assignedDsp: editContractForm.assignedDsp,
        isgKatipNo: editContractForm.isgKatipNo,
        paymentMethod: editContractForm.paymentMethod,
        paymentTerms: editContractForm.paymentTerms,
        autoRenew: editContractForm.autoRenew,
        services: editContractForm.services,
        vatMode: editContractForm.vatMode,
        ...financials
      };

      const updatedRecord: ContractRecord = {
        ...selectedContract,
        contractTitle: editContractForm.contractTitle,
        customerName: editContractForm.customerName,
        stage: editContractForm.stage,
        offerId: linkedOff?.id || selectedContract.offerId,
        offerNo: linkedOff?.offerNo || selectedContract.offerNo,
        startDate: editContractForm.startDate,
        endDate: editContractForm.endDate,
        vatMode: editContractForm.vatMode,
        acceptanceChannel: editContractForm.acceptanceChannel,
        acceptanceNotes: editContractForm.acceptanceNotes,
        assignedExpert: editContractForm.assignedExpert,
        assignedDoctor: editContractForm.assignedDoctor,
        assignedDsp: editContractForm.assignedDsp,
        isgKatipNo: editContractForm.isgKatipNo,
        paymentMethod: editContractForm.paymentMethod,
        paymentTerms: editContractForm.paymentTerms,
        billingCycle: editContractForm.billingCycle,
        autoRenew: editContractForm.autoRenew,
        notes: editContractForm.notes,
        currentRevisionNo: nextRevNo,
        revisions: [...selectedContract.revisions, newRev]
      };

      updateContractsState(contracts.map((c) => (c.id === selectedContract.id ? updatedRecord : c)));
    } else {
      // Overwrite active revision in place
      const updatedRevisions = [...selectedContract.revisions];
      const lastIdx = updatedRevisions.length - 1;
      if (lastIdx >= 0) {
        updatedRevisions[lastIdx] = {
          ...updatedRevisions[lastIdx],
          contractTitle: editContractForm.contractTitle,
          startDate: editContractForm.startDate,
          endDate: editContractForm.endDate,
          assignedExpert: editContractForm.assignedExpert,
          assignedDoctor: editContractForm.assignedDoctor,
          assignedDsp: editContractForm.assignedDsp,
          isgKatipNo: editContractForm.isgKatipNo,
          paymentMethod: editContractForm.paymentMethod,
          paymentTerms: editContractForm.paymentTerms,
          autoRenew: editContractForm.autoRenew,
          services: editContractForm.services,
          vatMode: editContractForm.vatMode,
          ...financials
        };
      }

      const updatedRecord: ContractRecord = {
        ...selectedContract,
        contractTitle: editContractForm.contractTitle,
        customerName: editContractForm.customerName,
        stage: editContractForm.stage,
        offerId: linkedOff?.id || selectedContract.offerId,
        offerNo: linkedOff?.offerNo || selectedContract.offerNo,
        startDate: editContractForm.startDate,
        endDate: editContractForm.endDate,
        vatMode: editContractForm.vatMode,
        acceptanceChannel: editContractForm.acceptanceChannel,
        acceptanceNotes: editContractForm.acceptanceNotes,
        assignedExpert: editContractForm.assignedExpert,
        assignedDoctor: editContractForm.assignedDoctor,
        assignedDsp: editContractForm.assignedDsp,
        isgKatipNo: editContractForm.isgKatipNo,
        paymentMethod: editContractForm.paymentMethod,
        paymentTerms: editContractForm.paymentTerms,
        billingCycle: editContractForm.billingCycle,
        autoRenew: editContractForm.autoRenew,
        notes: editContractForm.notes,
        revisions: updatedRevisions
      };

      updateContractsState(contracts.map((c) => (c.id === selectedContract.id ? updatedRecord : c)));
    }

    setEditModalOpen(false);
  };

  // Quick Stage Update handler
  const handleUpdateStage = (contractId: string, newStage: ContractStage) => {
    updateContractsState(
      contracts.map((c) => (c.id === contractId ? { ...c, stage: newStage } : c))
    );
  };

  // Renew line item date directly
  const handleRenewServiceLineDate = (contractId: string, lineId: string, extensionMonths: number = 12) => {
    const updatedList = contracts.map((c) => {
      if (c.id !== contractId) return c;
      const activeRev = c.revisions[c.revisions.length - 1];
      if (!activeRev) return c;

      const updatedServices = activeRev.services.map((srv) => {
        if (srv.id !== lineId) return srv;
        const currDate = srv.nextRenewalDate ? new Date(srv.nextRenewalDate) : new Date();
        currDate.setMonth(currDate.getMonth() + extensionMonths);
        return {
          ...srv,
          nextRenewalDate: currDate.toISOString().split('T')[0]
        };
      });

      const newRevNo = c.currentRevisionNo + 1;
      const financials = computeFinancials(updatedServices);
      const newRev: ContractRevision = {
        ...activeRev,
        revisionNo: newRevNo,
        revisionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        revisionNotes: `Kalem yenileme: "${updatedServices.find((s) => s.id === lineId)?.serviceName}" için +${extensionMonths} ay uzatıldı.`,
        services: updatedServices,
        ...financials
      };

      return {
        ...c,
        currentRevisionNo: newRevNo,
        stage: 'Aktif' as ContractStage,
        revisions: [...c.revisions, newRev]
      };
    });

    updateContractsState(updatedList);

    if (selectedContract && selectedContract.id === contractId) {
      setSelectedContract((prev) => {
        if (!prev) return null;
        const activeRev = prev.revisions[prev.revisions.length - 1];
        const updatedServices = activeRev.services.map((srv) => {
          if (srv.id !== lineId) return srv;
          const currDate = srv.nextRenewalDate ? new Date(srv.nextRenewalDate) : new Date();
          currDate.setMonth(currDate.getMonth() + extensionMonths);
          return { ...srv, nextRenewalDate: currDate.toISOString().split('T')[0] };
        });
        const newRevNo = prev.currentRevisionNo + 1;
        const financials = computeFinancials(updatedServices);
        const newRev: ContractRevision = {
          ...activeRev,
          revisionNo: newRevNo,
          revisionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
          revisionNotes: `Kalem yenileme: "${updatedServices.find((s) => s.id === lineId)?.serviceName}" için +${extensionMonths} ay uzatıldı.`,
          services: updatedServices,
          ...financials
        };
        return { ...prev, currentRevisionNo: newRevNo, stage: 'Aktif', revisions: [...prev.revisions, newRev] };
      });
    }
  };

  const [selectedRevisionFilter, setSelectedRevisionFilter] = useState<string>('Tümü');

  const handleSort = (key: ContractSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const sortIcon = (key: ContractSortKey) => {
    if (sortKey !== key) return <span>↕</span>;
    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>;
  };

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchSearch =
        !searchQuery ||
        c.contractTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contractNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.isgKatipNo && c.isgKatipNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.assignedExpert && c.assignedExpert.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.assignedDoctor && c.assignedDoctor.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStage = selectedStageFilter === 'Tümü' || c.stage === selectedStageFilter;
      const matchCustomer = selectedCustomerFilter === 'Tümü' || c.customerName === selectedCustomerFilter;

      let matchRenewal = true;
      if (selectedRenewalFilter === 'Yaklaşan Kalem Yenilemesi Var') {
        const activeRev = c.revisions[c.revisions.length - 1];
        const hasWarningLine = activeRev?.services?.some((srv) => {
          const st = getLineRenewalStatus(srv.nextRenewalDate);
          return st.status === 'warning' || st.status === 'expired';
        });
        matchRenewal = Boolean(hasWarningLine);
      } else if (selectedRenewalFilter === 'Güncel') {
        const activeRev = c.revisions[c.revisions.length - 1];
        const hasWarningLine = activeRev?.services?.some((srv) => {
          const st = getLineRenewalStatus(srv.nextRenewalDate);
          return st.status === 'warning' || st.status === 'expired';
        });
        matchRenewal = !hasWarningLine;
      }

      let matchRevFilter = true;
      if (selectedRevisionFilter === '⚡ Toplu Zam Yapılanlar') {
        matchRevFilter = (c.revisions || []).some(
          (r) => (r.preparedBy && r.preparedBy.includes('Toplu Zam Motoru')) || (r.revisionNotes && r.revisionNotes.includes('Toplu'))
        );
      } else if (selectedRevisionFilter === '⏰ Periyodik Yenilenenler') {
        matchRevFilter = (c.revisions || []).some(
          (r) => r.revisionNotes && r.revisionNotes.includes('1 Yıllık Periyodik Sözleşme Yenileme')
        );
      } else if (selectedRevisionFilter === '🔄 Manuel Revizyonlular') {
        matchRevFilter = (c.revisions || []).length > 1;
      }

      return matchSearch && matchStage && matchCustomer && matchRenewal && matchRevFilter;
    });
  }, [contracts, searchQuery, selectedStageFilter, selectedCustomerFilter, selectedRenewalFilter, selectedRevisionFilter]);

  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((left, right) => {
      const leftRev = left.revisions[left.revisions.length - 1];
      const rightRev = right.revisions[right.revisions.length - 1];

      let leftValue: string | number = '';
      let rightValue: string | number = '';

      switch (sortKey) {
        case 'contractTitle':
          leftValue = left.contractTitle.toLowerCase();
          rightValue = right.contractTitle.toLowerCase();
          break;
        case 'customerName':
          leftValue = left.customerName.toLowerCase();
          rightValue = right.customerName.toLowerCase();
          break;
        case 'stage':
          leftValue = left.stage.toLowerCase();
          rightValue = right.stage.toLowerCase();
          break;
        case 'amount':
          leftValue = Number(leftRev?.grandTotal) || 0;
          rightValue = Number(rightRev?.grandTotal) || 0;
          break;
        case 'endDate':
          leftValue = new Date(left.endDate).getTime() || 0;
          rightValue = new Date(right.endDate).getTime() || 0;
          break;
        case 'assigned':
          leftValue = `${left.assignedExpert || ''} ${left.assignedDoctor || ''} ${left.assignedDsp || ''}`.toLowerCase();
          rightValue = `${right.assignedExpert || ''} ${right.assignedDoctor || ''} ${right.assignedDsp || ''}`.toLowerCase();
          break;
        case 'contractNo':
        default:
          leftValue = left.contractNo.toLowerCase();
          rightValue = right.contractNo.toLowerCase();
          break;
      }

      if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
      if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredContracts, sortDirection, sortKey]);

  const bulkIncreasedContractsCount = useMemo(() => {
    return contracts.filter((c) =>
      (c.revisions || []).some(
        (r) => (r.preparedBy && r.preparedBy.includes('Toplu Zam Motoru')) || (r.revisionNotes && r.revisionNotes.includes('Toplu'))
      )
    ).length;
  }, [contracts]);

  // Overall KPI Statistics (Guaranteed Safe from NaN!)
  const kpiStats = useMemo(() => {
    let totalCount = contracts.length;
    let activeCount = 0;
    let pendingCount = 0;
    let totalMonthlyVolume = 0;

    contracts.forEach((c) => {
      if (c.stage === 'Aktif' || c.stage === 'Revizyonda') activeCount++;
      if (c.stage === 'Onay Bekliyor') pendingCount++;

      const activeRev = c.revisions[c.revisions.length - 1];
      if (activeRev && (c.stage === 'Aktif' || c.stage === 'Revizyonda')) {
        const val = (!isNaN(Number(activeRev.grandTotal)) && Number(activeRev.grandTotal) > 0)
          ? Number(activeRev.grandTotal)
          : computeFinancials(activeRev.services || []).grandTotal;
        totalMonthlyVolume += val;
      }
    });

    return {
      totalCount,
      activeCount,
      pendingCount,
      lineRenewalAlertCount: lineItemRenewalAlerts.length,
      totalMonthlyVolume
    };
  }, [contracts, lineItemRenewalAlerts]);

  return (
    <section className="panel panel-wide panel-elevated page-layout" style={{ gap: 20 }}>
      {/* HEADER BAR */}
      <div className="section-heading" style={{ flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            📜 Sözleşmeler & Kalem Bazlı Yenileme Yönetimi
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Müşterilerinizin aktif sözleşmelerini, İSG Katip kayıtlarını, kadro atamalarını ve hizmet kalemi bazlı yenilemelerini yönetin.
          </span>
        </div>

        <button
          type="button"
          className="btn-action-primary"
          onClick={() => {
            const startD = new Date().toISOString().split('T')[0];
            const endD = calculateDefaultEndDate(startD);

            setNewContractForm({
              contractTitle: '',
              customerName: customers.length > 0 ? customers[0].name : '',
              linkedOfferId: '',
              stage: 'Taslak', // Req b: Default is Taslak
              startDate: startD,
              endDate: endD, // Req d: 1 year minus 1 day
              vatMode: 'KDV Hariç',
              acceptanceChannel: 'Sözlü Onay (Telefon)',
              acceptanceNotes: '',
              owner: 'Ayşe Yılmaz',
              assignedExpert: '', // Req f: Empty default
              assignedDoctor: '', // Req f: Empty default
              assignedDsp: '',
              isgKatipNo: '', // Req e: Empty default
              paymentMethod: 'Banka Havalesi / EFT',
              paymentTerms: 'Aylık Düzenli Fatura',
              billingCycle: 'Aylık',
              autoRenew: true,
              services: [],
              notes: ''
            });
            resetCustomLineInput(); // Req c: Reset custom input fields
            setCreateModalOpen(true);
          }}
          style={{ padding: '9px 18px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          + Yeni Sözleşme Oluştur
        </button>
      </div>

      {/* TOP KPI CARDS */}
      <div className="customer-summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        <article className="summary-card" style={{ borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Aktif Sözleşmeler</span>
          <strong style={{ fontSize: '1.4rem', color: '#10b981' }}>{kpiStats.activeCount} Kayıt</strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam {kpiStats.totalCount} sözleşme içinde</p>
        </article>

        <article className="summary-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>İmza / Onay Bekleyen</span>
          <strong style={{ fontSize: '1.4rem', color: '#f59e0b' }}>{kpiStats.pendingCount} Dosya</strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Müşteri onayı bekleniyor</p>
        </article>

        <article className="summary-card" style={{ borderLeft: '4px solid #ec4899' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Kalem Bazlı Yenilemeler ⭐</span>
          <strong style={{ fontSize: '1.4rem', color: '#ec4899' }}>{kpiStats.lineRenewalAlertCount} Kalem Uyarısı</strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>30 gün içinde yenilenecek hizmetler</p>
        </article>

        <article className="summary-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Aylık Sözleşme Hacmi</span>
          <strong style={{ fontSize: '1.4rem', color: '#6366f1' }}>₺{kpiStats.totalMonthlyVolume.toLocaleString('tr-TR')}</strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aktif sözleşmeler aylık tutarı</p>
        </article>
      </div>

      {/* KALEM BAZLI YENİLEME HATIRLATICI UYARISI (LINE ITEM RENEWAL WIDGET) */}
      {lineItemRenewalAlerts.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                Yaklaşan Kalem Yenileme Hatırlatıcıları ({lineItemRenewalAlerts.length} Hizmet Kalemi)
              </strong>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Kalem bazlı periyotlar anlık olarak takip ediliyor
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {lineItemRenewalAlerts.slice(0, 4).map(({ contract, service, daysLeft }) => {
              const statusBadge = getLineRenewalStatus(service.nextRenewalDate);
              return (
                <div
                  key={`${contract.id}-${service.id}`}
                  style={{
                    background: 'var(--surface-strong)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>{contract.customerName}</strong>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: statusBadge.bg,
                        color: statusBadge.color
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📌 {service.serviceName} ({service.renewalPeriod || 'Yıllık'})</span>
                    <strong>{service.nextRenewalDate}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContract(contract);
                        setDetailTab('services');
                        setDetailModalOpen(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                    >
                      Sözleşmede Gör
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRenewServiceLineDate(contract.id, service.id, 12)}
                      style={{
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      +1 Yıl Uzat / Yenile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BULK REVISION BANNER IF APPLIED */}
      {bulkIncreasedContractsCount > 0 && (
        <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '10px 16px', borderRadius: 10, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚡ TOPLU ZAM REVİZYONU BİLDİRİMİ:</span>
            <span>Sistemdeki {bulkIncreasedContractsCount} adet sözleşmeye toplu zam ek protokolü uygulanmıştır.</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRevisionFilter('⚡ Toplu Zam Yapılanlar')}
            style={{ background: '#d97706', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            ⚡ Bu Sözleşmeleri Listele ({bulkIncreasedContractsCount})
          </button>
        </div>
      )}

      {/* FILTERS TOOLBAR */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔎 Sözleşme takip adı, no, müşteri, İSG Katip veya uzman/hekim ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: '1 1 280px',
            padding: '9px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-strong)',
            color: 'var(--text-main)',
            fontSize: '0.86rem'
          }}
        />

        <select
          value={selectedStageFilter}
          onChange={(e) => setSelectedStageFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.86rem' }}
        >
          <option value="Tümü">Tüm Aşamalar</option>
          <option value="Aktif">✅ Aktif</option>
          <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
          <option value="Revizyonda">🔄 Revizyonda</option>
          <option value="Yenilenecek">⏰ Yenilenecek</option>
          <option value="Süresi Doldu">🛑 Süresi Doldu</option>
          <option value="Taslak">📝 Taslak</option>
        </select>

        <select
          value={selectedRevisionFilter}
          onChange={(e) => setSelectedRevisionFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.86rem' }}
        >
          <option value="Tümü">Tüm Revizyon Tipleri</option>
          <option value="⚡ Toplu Zam Yapılanlar">⚡ Toplu Zam Yapılanlar</option>
          <option value="⏰ Periyodik Yenilenenler">⏰ Periyodik Yenilenenler</option>
          <option value="🔄 Manuel Revizyonlular">🔄 Manuel Revizyonlular</option>
        </select>

        <select
          value={selectedRenewalFilter}
          onChange={(e) => setSelectedRenewalFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.86rem' }}
        >
          <option value="Tümü">Tüm Kalem Yenileme Durumları</option>
          <option value="Yaklaşan Kalem Yenilemesi Var">⚠️ Yaklaşan Kalem Yenilemesi Var</option>
          <option value="Güncel">🟢 Tüm Kalemler Güncel</option>
        </select>

        <select
          value={selectedCustomerFilter}
          onChange={(e) => setSelectedCustomerFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.86rem' }}
        >
          <option value="Tümü">Tüm Müşteriler</option>
          {customers.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* CONTRACTS TABLE */}
      <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px 16px' }}>
                <button type="button" className="table-sort-button" onClick={() => handleSort('contractNo')}>
                  Sözleşme Takip Adı & No {sortIcon('contractNo')}
                </button>
              </th>
              <th style={{ padding: '12px 16px' }}>
                <button type="button" className="table-sort-button" onClick={() => handleSort('customerName')}>
                  Müşteri {sortIcon('customerName')}
                </button>
              </th>
              <th style={{ padding: '12px 16px' }}>
                <button type="button" className="table-sort-button" onClick={() => handleSort('stage')}>
                  Aşama {sortIcon('stage')}
                </button>
              </th>
              <th style={{ padding: '12px 16px' }}>
                <button type="button" className="table-sort-button" onClick={() => handleSort('amount')}>
                  Aylık Tutar {sortIcon('amount')}
                </button>
              </th>
              <th style={{ padding: '12px 16px' }}>
                <button type="button" className="table-sort-button" onClick={() => handleSort('assigned')}>
                  Atanan İSG Kadrosu & Katip No {sortIcon('assigned')}
                </button>
              </th>
              <th style={{ padding: '12px 16px' }}>
                <button type="button" className="table-sort-button" onClick={() => handleSort('endDate')}>
                  Geçerlilik Tarihi {sortIcon('endDate')}
                </button>
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {sortedContracts.length > 0 ? (
              sortedContracts.map((cnt) => {
                const activeRev = cnt.revisions[cnt.revisions.length - 1];
                const badge = stageBadges[cnt.stage] || stageBadges['Taslak'];

                // Req f: Guaranteed safe display total without NaN!
                const displayTotal = activeRev && !isNaN(Number(activeRev.grandTotal)) && Number(activeRev.grandTotal) > 0
                  ? Number(activeRev.grandTotal)
                  : computeFinancials(activeRev?.services || []).grandTotal;

                const warningLineCount = activeRev?.services?.filter((srv) => {
                  const st = getLineRenewalStatus(srv.nextRenewalDate);
                  return st.status === 'warning' || st.status === 'expired';
                }).length || 0;

                return (
                  <tr key={cnt.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <strong
                        onClick={() => {
                          setSelectedContract(cnt);
                          setDetailTab('overview');
                          setDetailModalOpen(true);
                        }}
                        style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: '0.92rem', display: 'block' }}
                      >
                        {cnt.contractTitle}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        🏷️ {cnt.contractNo} {cnt.offerNo && `(Teklif: ${cnt.offerNo})`}
                        {cnt.acceptanceChannel && (
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: '0.72rem' }}>
                            {cnt.acceptanceChannel}
                          </span>
                        )}
                        {activeRev && ((activeRev.preparedBy && activeRev.preparedBy.includes('Toplu Zam Motoru')) || (activeRev.revisionNotes && activeRev.revisionNotes.includes('Toplu'))) && (
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.18)', color: '#d97706', fontSize: '0.72rem', fontWeight: 800, border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                            ⚡ Toplu Zam Ek Protokolü (Rev. {cnt.currentRevisionNo})
                          </span>
                        )}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {cnt.customerName}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={cnt.stage}
                        onChange={(e) => handleUpdateStage(cnt.id, e.target.value as ContractStage)}
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: '0.85rem',
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

                    <td style={{ padding: '12px 16px' }}>
                      {(() => {
                        const vMode = cnt.vatMode || activeRev?.vatMode || 'KDV Hariç';
                        const grandT = activeRev && !isNaN(Number(activeRev.grandTotal)) && Number(activeRev.grandTotal) > 0
                          ? Number(activeRev.grandTotal)
                          : computeFinancials(activeRev?.services || [], vMode).grandTotal;
                        const subT = activeRev && !isNaN(Number(activeRev.subtotal))
                          ? Number(activeRev.subtotal)
                          : computeFinancials(activeRev?.services || [], vMode).subtotal;

                        if (vMode === 'KDV Dahil') {
                          return (
                            <>
                              <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', display: 'block' }}>
                                ₺{grandT.toLocaleString('tr-TR')} /ay
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                                (KDV Dahil Anlaşılan)
                              </span>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Matrah: ₺{subT.toLocaleString('tr-TR')}
                              </span>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', display: 'block' }}>
                                ₺{subT.toLocaleString('tr-TR')} /ay
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 700 }}>
                                (KDV Hariç Matrah)
                              </span>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                KDV Dahil Toplam: ₺{grandT.toLocaleString('tr-TR')}
                              </span>
                            </>
                          );
                        }
                      })()}
                      {warningLineCount > 0 && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, marginTop: 2 }}>
                          ⚠️ {warningLineCount} Kalem Yenilenecek
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                      <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        👷 Uzman: {cnt.assignedExpert || 'Atanmadı'}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        🩺 Hekim: {cnt.assignedDoctor || 'Atanmadı'}
                      </div>
                      {cnt.isgKatipNo && (
                        <span style={{ fontSize: '0.74rem', color: '#6366f1', fontWeight: 700 }}>
                          📋 İSG-Katip No: {cnt.isgKatipNo}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      📅 {cnt.startDate} ~ {cnt.endDate}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedContract(cnt);
                            setDetailTab('history');
                            setDetailModalOpen(true);
                          }}
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: (cnt.revisions && cnt.revisions.some((r) => (r.preparedBy && r.preparedBy.includes('Toplu Zam Motoru')) || (r.revisionNotes && r.revisionNotes.includes('Toplu')))) ? '#d97706' : '#6366f1',
                            background: (cnt.revisions && cnt.revisions.some((r) => (r.preparedBy && r.preparedBy.includes('Toplu Zam Motoru')) || (r.revisionNotes && r.revisionNotes.includes('Toplu')))) ? 'rgba(245, 158, 11, 0.14)' : 'rgba(99, 102, 241, 0.1)'
                          }}
                          title="Revizyon Geçmişi ve Zam Ek Protokolleri"
                        >
                          🔄 Sürümler ({cnt.revisions?.length || 1})
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedContract(cnt);
                            setDetailTab('overview');
                            setDetailModalOpen(true);
                          }}
                          style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                        >
                          👁️ Detay
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleOpenEditModal(cnt)}
                          style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedContract(cnt);
                            setPdfModalOpen(true);
                          }}
                          style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                        >
                          🖨️ PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Arama kriterlerine uygun sözleşme kaydı bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- CREATE CONTRACT MODAL --- */}
      {createModalOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
          >
            <div
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                width: '100%',
                maxWidth: 900,
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>➕ Yeni Sözleşme Oluştur</h3>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateContractSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 📌 GRUP 1: TEMEL SÖZLEŞME & GEÇERLİLİK BİLGİLERİ */}
                <details className="form-accordion-section">
                  <summary>
                    <span>📌 1. Temel Sözleşme & Geçerlilik Bilgileri</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Müşteri Firma</label>
                        <select
                          value={newContractForm.customerName}
                          onChange={(e) => setNewContractForm({ ...newContractForm, customerName: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          {customers.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                          🔗 Bağlı Teklif (İsteğe Bağlı)
                        </label>
                        {(() => {
                          const { activeOffers, completedOffers, closedOffers } = getCategorizedOffersForCustomer(newContractForm.customerName);
                          return (
                            <select
                              value={newContractForm.linkedOfferId}
                              onChange={(e) => handleSelectLinkedOffer(e.target.value)}
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
                        value={newContractForm.contractTitle}
                        onChange={(e) => setNewContractForm({ ...newContractForm, contractTitle: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: checkDuplicateTitle(newContractForm.contractTitle) ? '2px solid #ef4444' : '1px solid var(--border)',
                          background: 'var(--surface-strong)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem'
                        }}
                      />
                      {checkDuplicateTitle(newContractForm.contractTitle) && (
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginTop: 4, display: 'block' }}>
                          ⚠️ Bu takip adı başka bir sözleşmede kullanılıyor! Lütfen benzersiz bir ad girin.
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Sözleşme Aşaması</label>
                        <select
                          value={newContractForm.stage}
                          onChange={(e) => setNewContractForm({ ...newContractForm, stage: e.target.value as ContractStage })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          <option value="Taslak">📝 Taslak (Varsayılan)</option>
                          <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
                          <option value="Aktif">✅ Aktif</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Fiyatlandırma Tipi (KDV Durumu) *</label>
                        <select
                          value={newContractForm.vatMode}
                          onChange={(e) => setNewContractForm({ ...newContractForm, vatMode: e.target.value as VatMode })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--accent)', fontWeight: 700 }}
                        >
                          <option value="KDV Hariç">KDV Hariç Fiyatlar (Varsayılan)</option>
                          <option value="KDV Dahil">KDV Dahil Fiyatlar (Anlaşılan Toplam)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Başlangıç Tarihi</label>
                        <input
                          type="date"
                          value={newContractForm.startDate}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const newEnd = calculateDefaultEndDate(newStart);
                            setNewContractForm({ ...newContractForm, startDate: newStart, endDate: newEnd });
                          }}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>
                          Bitiş Tarihi (Otomatik: 1 Yıl - 1 Gün)
                        </label>
                        <input
                          type="date"
                          value={newContractForm.endDate}
                          onChange={(e) => setNewContractForm({ ...newContractForm, endDate: e.target.value })}
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Atanan İSG Uzmanı</label>
                        <select
                          value={newContractForm.assignedExpert}
                          onChange={(e) => setNewContractForm({ ...newContractForm, assignedExpert: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          <option value="">-- İSG Uzmanı Seçilmedi (Boş) --</option>
                          {isgExpertsList.map((exp) => (
                            <option key={exp.name} value={exp.name}>
                              {exp.name} ({exp.userType})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Atanan İşyeri Hekimi</label>
                        <select
                          value={newContractForm.assignedDoctor}
                          onChange={(e) => setNewContractForm({ ...newContractForm, assignedDoctor: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          <option value="">-- İşyeri Hekimi Seçilmedi (Boş) --</option>
                          {workplaceDoctorsList.map((doc) => (
                            <option key={doc.name} value={doc.name}>
                              {doc.name} ({doc.userType})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Atanan Diğer Sağlık Personeli (DSP)</label>
                        <select
                          value={newContractForm.assignedDsp}
                          onChange={(e) => setNewContractForm({ ...newContractForm, assignedDsp: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          <option value="">-- DSP Seçilmedi --</option>
                          {dspList.map((dsp) => (
                            <option key={dsp.name} value={dsp.name}>
                              {dsp.name} ({dsp.userType})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>İSG-Katip Sözleşme No</label>
                        <input
                          type="text"
                          placeholder="Örn: KTP-2026-98741 (İsteğe bağlı)"
                          value={newContractForm.isgKatipNo}
                          onChange={(e) => setNewContractForm({ ...newContractForm, isgKatipNo: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Kabul / Onay Kanalı</label>
                      <select
                        value={newContractForm.acceptanceChannel}
                        onChange={(e) => setNewContractForm({ ...newContractForm, acceptanceChannel: e.target.value as AcceptanceChannel })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
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
                        value={newContractForm.paymentMethod}
                        onChange={(e) => setNewContractForm({ ...newContractForm, paymentMethod: e.target.value as PaymentMethod })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
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
                        value={newContractForm.paymentTerms}
                        onChange={(e) => setNewContractForm({ ...newContractForm, paymentTerms: e.target.value as PaymentTerms })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
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
                        value={newContractForm.billingCycle}
                        onChange={(e) => setNewContractForm({ ...newContractForm, billingCycle: e.target.value as any })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
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
                <details className="form-accordion-section">
                  <summary>
                    <span>💼 4. Hizmet Kalemleri & Fiyatlandırma ({newContractForm.services.length} Kalem)</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      {newContractForm.customerName && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700 }}>
                          🔍 {newContractForm.customerName} Filtreli Fiyat Listesi
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                      <select
                        value={selectedPriceRuleId}
                        onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                        style={{ flex: '1 1 240px', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      >
                        <option value="">-- {newContractForm.customerName || 'Firma'} İçin Matristen Kalem Seç --</option>
                        {getFilteredPriceRulesForCustomer(newContractForm.customerName).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.service_name} ({r.danger_class} / {r.min_emp}-{r.max_emp || '∞'} Çalışan) - ₺{r.price}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAddPriceRuleLine(newContractForm.customerName, newContractForm.services, (lines) => setNewContractForm({ ...newContractForm, services: lines }))}
                        className="btn-secondary"
                        style={{ padding: '8px 14px', fontWeight: 700 }}
                      >
                        + Matristen Kalem Ekle
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                      <input
                        type="text"
                        placeholder="Özel Hizmet Adı"
                        value={customLineInput.serviceName}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, serviceName: e.target.value })}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                      <select
                        value={customLineInput.unit}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, unit: e.target.value })}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
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
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                      <input
                        type="number"
                        placeholder="Birim Fiyat (₺)"
                        value={customLineInput.unitPrice || ''}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, unitPrice: Number(e.target.value) })}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                      <select
                        value={customLineInput.renewalPeriod}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, renewalPeriod: e.target.value as RenewalPeriod })}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
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
                        onClick={() => handleAddCustomLine(newContractForm.services, (lines) => setNewContractForm({ ...newContractForm, services: lines }))}
                        style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', padding: '6px 10px' }}
                      >
                        + Elle Kalem Ekle
                      </button>
                    </div>

                    {newContractForm.services.length > 0 ? (
                      <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left' }}>
                            <th style={{ padding: 6 }}>Hizmet</th>
                            <th style={{ padding: 6 }}>Miktar</th>
                            <th style={{ padding: 6 }}>Birim Fiyat</th>
                            <th style={{ padding: 6 }}>Toplam</th>
                            <th style={{ padding: 6 }}>Yenileme Periyodu</th>
                            <th style={{ padding: 6 }}>Sonraki Yenileme</th>
                            <th style={{ padding: 6 }}>Sil</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newContractForm.services.map((line, idx) => (
                            <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-main)' }}>{line.serviceName}</td>
                              <td style={{ padding: '8px 10px' }}>{line.quantity} {line.unit}</td>
                              <td style={{ padding: '8px 10px' }}>₺{line.unitPrice.toLocaleString('tr-TR')}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-main)' }}>₺{line.lineTotal.toLocaleString('tr-TR')}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <select
                                  value={line.renewalPeriod || 'Yıllık'}
                                  onChange={(e) => {
                                    const updated = [...newContractForm.services];
                                    updated[idx].renewalPeriod = e.target.value as RenewalPeriod;
                                    setNewContractForm({ ...newContractForm, services: updated });
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface-strong)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.83rem',
                                    fontWeight: 600
                                  }}
                                >
                                  <option value="Yıllık">Yıllık</option>
                                  <option value="6 Aylık">6 Aylık</option>
                                  <option value="3 Aylık">3 Aylık</option>
                                  <option value="Aylık">Aylık</option>
                                  <option value="2 Yıllık">2 Yıllık</option>
                                  <option value="Yok">Yok</option>
                                </select>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <input
                                  type="date"
                                  value={line.nextRenewalDate || ''}
                                  onChange={(e) => {
                                    const updated = [...newContractForm.services];
                                    updated[idx].nextRenewalDate = e.target.value;
                                    setNewContractForm({ ...newContractForm, services: updated });
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                    background: 'var(--surface-strong)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.83rem',
                                    fontWeight: 600
                                  }}
                                />
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  title="Kalemi Sil"
                                  onClick={() => {
                                    const updated = newContractForm.services.filter((_, i) => i !== idx);
                                    setNewContractForm({ ...newContractForm, services: updated });
                                  }}
                                  style={{
                                    color: '#ef4444',
                                    border: 'none',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Henüz hizmet kalemi eklenmedi.</p>
                    )}
                  </div>
                </details>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button type="button" className="btn-secondary" onClick={() => setCreateModalOpen(false)}>
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="btn-action-primary"
                    disabled={checkDuplicateTitle(newContractForm.contractTitle)}
                    style={{ opacity: checkDuplicateTitle(newContractForm.contractTitle) ? 0.5 : 1 }}
                  >
                    💾 Sözleşmeyi Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* --- EDIT / REVISION MODAL (Req e: FULL FIELDS EDIT MODAL!) --- */}
      {editModalOpen && selectedContract &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
          >
            <div
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                width: '100%',
                maxWidth: 920,
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>✏️ Sözleşme Düzenle / Revizyon Oluştur</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {selectedContract.contractNo} - Mevcut Sürüm: Rev. {selectedContract.currentRevisionNo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* BULK REVISION & DATE COMPARISON CONTEXT BANNER */}
                {(() => {
                  const revs = selectedContract.revisions || [];
                  const activeRev = revs[revs.length - 1];
                  const prevRev = revs.length > 1 ? revs[revs.length - 2] : null;
                  const isBulk = activeRev && ((activeRev.preparedBy && activeRev.preparedBy.includes('Toplu Zam Motoru')) || (activeRev.revisionNotes && activeRev.revisionNotes.includes('Toplu')));

                  if (!isBulk && !prevRev) return null;

                  return (
                    <div style={{ background: isBulk ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.08)', border: isBulk ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(99, 102, 241, 0.3)', padding: 14, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <strong style={{ color: isBulk ? '#d97706' : '#6366f1', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{isBulk ? '⚡' : '🔄'}</span> DÜZENLENEN SÜRÜM: {isBulk ? 'TOPLU ZAM EK PROTOKOLÜ' : 'SÖZLEŞME REVİZYONU'} (Revizyon #{activeRev?.revisionNo || selectedContract.currentRevisionNo})
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
                            <strong style={{ color: isBulk ? '#d97706' : '#6366f1' }}>📅 {editContractForm.startDate} ~ {editContractForm.endDate} (1 Yıl Geçerli)</strong>
                            <div style={{ color: isBulk ? '#d97706' : '#6366f1', fontWeight: 800, marginTop: 2 }}>₺{(Number(activeRev?.grandTotal) || 0).toLocaleString('tr-TR')} /ay</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 📌 GRUP 1: TEMEL SÖZLEŞME & GEÇERLİLİK BİLGİLERİ */}
                <details className="form-accordion-section">
                  <summary>
                    <span>📌 1. Temel Sözleşme & Geçerlilik Bilgileri</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Müşteri Firma</label>
                        <select
                          value={editContractForm.customerName}
                          onChange={(e) => setEditContractForm({ ...editContractForm, customerName: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          {customers.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Bağlı Teklif (İsteğe Bağlı)</label>
                        {(() => {
                          const { activeOffers, completedOffers, closedOffers } = getCategorizedOffersForCustomer(editContractForm.customerName);
                          return (
                            <select
                              value={editContractForm.linkedOfferId}
                              onChange={(e) => handleSelectLinkedOffer(e.target.value, true)}
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
                        value={editContractForm.contractTitle}
                        onChange={(e) => setEditContractForm({ ...editContractForm, contractTitle: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: checkDuplicateTitle(editContractForm.contractTitle, selectedContract.id) ? '2px solid #ef4444' : '1px solid var(--border)',
                          background: 'var(--surface-strong)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem'
                        }}
                      />
                      {checkDuplicateTitle(editContractForm.contractTitle, selectedContract.id) && (
                        <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, marginTop: 4, display: 'block' }}>
                          ⚠️ Bu takip adı başka bir sözleşmede kayıtlı!
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Sözleşme Aşaması</label>
                        <select
                          value={editContractForm.stage}
                          onChange={(e) => setEditContractForm({ ...editContractForm, stage: e.target.value as ContractStage })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                        >
                          <option value="Taslak">📝 Taslak</option>
                          <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
                          <option value="Aktif">✅ Aktif</option>
                          <option value="Revizyonda">🔄 Revizyonda</option>
                          <option value="Yenilenecek">⏰ Yenilenecek</option>
                          <option value="Süresi Doldu">🛑 Süresi Doldu</option>
                          <option value="Feshedildi">✕ Feshedildi</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Fiyatlandırma Tipi (KDV Durumu)</label>
                        <select
                          value={editContractForm.vatMode}
                          onChange={(e) => setEditContractForm({ ...editContractForm, vatMode: e.target.value as VatMode })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem', fontWeight: 600 }}
                        >
                          <option value="KDV Hariç">KDV Hariç Fiyatlar (Varsayılan)</option>
                          <option value="KDV Dahil">KDV Dahil Fiyatlar (Anlaşılan Toplam)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Başlangıç Tarihi</label>
                        <input
                          type="date"
                          value={editContractForm.startDate}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            const newEnd = calculateDefaultEndDate(newStart);
                            setEditContractForm({ ...editContractForm, startDate: newStart, endDate: newEnd });
                          }}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Bitiş Tarihi (1 Yıl - 1 Gün)</label>
                        <input
                          type="date"
                          value={editContractForm.endDate}
                          onChange={(e) => setEditContractForm({ ...editContractForm, endDate: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
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
                          value={editContractForm.assignedExpert}
                          onChange={(e) => setEditContractForm({ ...editContractForm, assignedExpert: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          <option value="">-- Uzman Seçilmedi (Boş) --</option>
                          {isgExpertsList.map((exp) => (
                            <option key={exp.name} value={exp.name}>{exp.name} ({exp.userType})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Atanan İşyeri Hekimi</label>
                        <select
                          value={editContractForm.assignedDoctor}
                          onChange={(e) => setEditContractForm({ ...editContractForm, assignedDoctor: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        >
                          <option value="">-- Hekim Seçilmedi (Boş) --</option>
                          {workplaceDoctorsList.map((doc) => (
                            <option key={doc.name} value={doc.name}>{doc.name} ({doc.userType})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>İSG-Katip Sözleşme No</label>
                        <input
                          type="text"
                          placeholder="Örn: KTP-2026-98741"
                          value={editContractForm.isgKatipNo}
                          onChange={(e) => setEditContractForm({ ...editContractForm, isgKatipNo: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Kabul / Onay Kanalı</label>
                      <select
                        value={editContractForm.acceptanceChannel}
                        onChange={(e) => setEditContractForm({ ...editContractForm, acceptanceChannel: e.target.value as AcceptanceChannel })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
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
                        value={editContractForm.paymentMethod}
                        onChange={(e) => setEditContractForm({ ...editContractForm, paymentMethod: e.target.value as PaymentMethod })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                      >
                        <option value="Banka Havalesi / EFT">🏦 Banka Havalesi / EFT</option>
                        <option value="Kredi Kartı (Mail Order)">💳 Kredi Kartı (Mail Order)</option>
                        <option value="Çek / Senet">📄 Çek / Senet</option>
                        <option value="Nakit">💵 Nakit</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>Ödeme Şekli</label>
                      <select
                        value={editContractForm.paymentTerms}
                        onChange={(e) => setEditContractForm({ ...editContractForm, paymentTerms: e.target.value as PaymentTerms })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
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
                        value={editContractForm.billingCycle}
                        onChange={(e) => setEditContractForm({ ...editContractForm, billingCycle: e.target.value as any })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
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
                <details className="form-accordion-section">
                  <summary>
                    <span>💼 4. Hizmet Kalemleri & Fiyatlandırma ({editContractForm.services.length} Kalem)</span>
                    <span className="accordion-status-badge">Aç / Kapat ▼</span>
                  </summary>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 700 }}>
                        🔍 {editContractForm.customerName} Filtreli Fiyat Listesi
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                      <select
                        value={selectedPriceRuleId}
                        onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                        style={{ flex: '1 1 240px', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      >
                        <option value="">-- {editContractForm.customerName || 'Firma'} İçin Matristen Kalem Seç --</option>
                        {getFilteredPriceRulesForCustomer(editContractForm.customerName).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.service_name} ({r.danger_class} / {r.min_emp}-{r.max_emp || '∞'} Çalışan) - ₺{r.price}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAddPriceRuleLine(editContractForm.customerName, editContractForm.services, (lines) => setEditContractForm({ ...editContractForm, services: lines }))}
                        className="btn-secondary"
                        style={{ padding: '8px 14px', fontWeight: 700 }}
                      >
                        + Matristen Kalem Ekle
                      </button>
                    </div>

                    {/* Manual Line Item Form */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                      <input
                        type="text"
                        placeholder="Özel Hizmet Adı"
                        value={customLineInput.serviceName}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, serviceName: e.target.value })}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                      <select
                        value={customLineInput.unit}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, unit: e.target.value })}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
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
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                      <input
                        type="number"
                        placeholder="Birim Fiyat (₺)"
                        value={customLineInput.unitPrice || ''}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, unitPrice: Number(e.target.value) })}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                      <select
                        value={customLineInput.renewalPeriod}
                        onChange={(e) => setCustomLineInput({ ...customLineInput, renewalPeriod: e.target.value as RenewalPeriod })}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
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
                        onClick={() => handleAddCustomLine(editContractForm.services, (lines) => setEditContractForm({ ...editContractForm, services: lines }))}
                        style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', padding: '6px 10px' }}
                      >
                        + Elle Kalem Ekle
                      </button>
                    </div>

                    <table style={{ width: '100%', fontSize: '0.84rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left' }}>
                          <th style={{ padding: 6 }}>Hizmet</th>
                          <th style={{ padding: 6 }}>Miktar</th>
                          <th style={{ padding: 6 }}>Birim Fiyat</th>
                          <th style={{ padding: 6 }}>Toplam</th>
                          <th style={{ padding: 6 }}>Yenileme Periyodu</th>
                          <th style={{ padding: 6 }}>Sonraki Yenileme Tarihi</th>
                          <th style={{ padding: 6 }}>Sil</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editContractForm.services.map((line, idx) => {
                          const revs = selectedContract.revisions || [];
                          const prevRev = revs.length > 1 ? revs[revs.length - 2] : null;
                          const prevLine = prevRev?.services?.find((ps) => ps.serviceName.trim().toLowerCase() === line.serviceName.trim().toLowerCase());

                          return (
                            <tr key={line.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-main)' }}>{line.serviceName}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <input
                                    type="number"
                                    min="1"
                                    value={line.quantity}
                                    onChange={(e) => {
                                      const newQty = Number(e.target.value);
                                      const updated = [...editContractForm.services];
                                      updated[idx] = {
                                        ...updated[idx],
                                        quantity: newQty,
                                        lineTotal: Math.round(newQty * (Number(updated[idx].unitPrice) || 0))
                                      };
                                      setEditContractForm({ ...editContractForm, services: updated });
                                    }}
                                    style={{
                                      width: 65,
                                      padding: '4px 6px',
                                      borderRadius: 6,
                                      border: '1px solid var(--border)',
                                      background: 'var(--surface-strong)',
                                      color: 'var(--text-main)',
                                      fontSize: '0.85rem',
                                      fontWeight: 700
                                    }}
                                  />
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{line.unit}</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-muted)' }}>₺</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={line.unitPrice}
                                      onChange={(e) => {
                                        const newPrice = Number(e.target.value);
                                        const updated = [...editContractForm.services];
                                        updated[idx] = {
                                          ...updated[idx],
                                          unitPrice: newPrice,
                                          lineTotal: Math.round(newPrice * (Number(updated[idx].quantity) || 1))
                                        };
                                        setEditContractForm({ ...editContractForm, services: updated });
                                      }}
                                      style={{
                                        width: 110,
                                        padding: '4px 6px',
                                        borderRadius: 6,
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface-strong)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.88rem',
                                        fontWeight: 800
                                      }}
                                    />
                                  </div>
                                  {prevLine && prevLine.unitPrice !== line.unitPrice && (
                                    <span style={{ fontSize: '0.73rem', color: '#d97706', fontWeight: 600 }}>
                                      (Eski Fiyat: ₺{prevLine.unitPrice.toLocaleString('tr-TR')})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>
                                ₺{(Math.round((line.quantity || 1) * (line.unitPrice || 0))).toLocaleString('tr-TR')}
                              </td>
                            <td style={{ padding: '8px 10px' }}>
                              <select
                                value={line.renewalPeriod || 'Yıllık'}
                                onChange={(e) => {
                                  const updated = [...editContractForm.services];
                                  updated[idx].renewalPeriod = e.target.value as RenewalPeriod;
                                  setEditContractForm({ ...editContractForm, services: updated });
                                }}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface-strong)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.83rem',
                                  fontWeight: 600
                                }}
                              >
                                <option value="Yıllık">Yıllık</option>
                                <option value="6 Aylık">6 Aylık</option>
                                <option value="3 Aylık">3 Aylık</option>
                                <option value="Aylık">Aylık</option>
                                <option value="2 Yıllık">2 Yıllık</option>
                                <option value="Yok">Yok</option>
                              </select>
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                type="date"
                                value={line.nextRenewalDate || ''}
                                onChange={(e) => {
                                  const updated = [...editContractForm.services];
                                  updated[idx].nextRenewalDate = e.target.value;
                                  setEditContractForm({ ...editContractForm, services: updated });
                                }}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 8,
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface-strong)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.83rem',
                                  fontWeight: 600
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                title="Kalemi Sil"
                                onClick={() => {
                                  const updated = editContractForm.services.filter((_, i) => i !== idx);
                                  setEditContractForm({ ...editContractForm, services: updated });
                                }}
                                style={{
                                  color: '#ef4444',
                                  border: 'none',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  fontSize: '0.9rem'
                                }}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </details>

                {/* Revision Save Option at very bottom */}
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: 12, borderRadius: 10, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, color: '#6366f1' }}>
                    <input
                      type="checkbox"
                      checked={editContractForm.saveAsNewRevision}
                      onChange={(e) => setEditContractForm({ ...editContractForm, saveAsNewRevision: e.target.checked })}
                    />
                    <span>🔄 Yapılan Değişiklikleri Yeni Revizyon / Ek Protokol Olarak Kaydet (Sürüm Rev. {selectedContract.currentRevisionNo + 1})</span>
                  </label>
                  {editContractForm.saveAsNewRevision && (
                    <input
                      type="text"
                      placeholder="Revizyon notu girin (Örn: Mobil sağlık kalem eklendi, fiyat güncellendi)"
                      value={editContractForm.revisionNotes}
                      onChange={(e) => setEditContractForm({ ...editContractForm, revisionNotes: e.target.value })}
                      style={{ width: '100%', marginTop: 8, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditModalOpen(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn-action-primary">
                    💾 Değişiklikleri Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* --- CONTRACT DETAIL DRAWER / MODAL --- */}
      {detailModalOpen && selectedContract &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
          >
            <div
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                width: '100%',
                maxWidth: 960,
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{selectedContract.contractTitle}</h3>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, background: stageBadges[selectedContract.stage].bg, color: stageBadges[selectedContract.stage].color }}>
                      {stageBadges[selectedContract.stage].label}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Kayıt No: <strong>{selectedContract.contractNo}</strong> | Müşteri: <strong>{selectedContract.customerName}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              {/* Sub-Tabs */}
              <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setDetailTab('overview')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    background: detailTab === 'overview' ? 'var(--accent)' : 'transparent',
                    color: detailTab === 'overview' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  📊 Genel Bilgiler & Ödeme
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('services')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    background: detailTab === 'services' ? 'var(--accent)' : 'transparent',
                    color: detailTab === 'services' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  📦 Hizmet Kalemleri & Yenilemeler
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('staff')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    background: detailTab === 'staff' ? 'var(--accent)' : 'transparent',
                    color: detailTab === 'staff' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  👷 Atanan İSG Kadrosu & Katip
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('history')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    background: detailTab === 'history' ? 'var(--accent)' : 'transparent',
                    color: detailTab === 'history' ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  🔄 Revizyon & Ek Protokol Geçmişi ({selectedContract.revisions.length})
                </button>
              </div>

              {/* TAB 1: OVERVIEW */}
              {detailTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  <div style={{ background: 'var(--surface-subtle)', padding: 14, borderRadius: 10 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>📅 Tarih ve Süre Bilgileri</h4>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Başlangıç Tarihi:</strong> {selectedContract.startDate}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Bitiş Tarihi:</strong> {selectedContract.endDate}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Otomatik Yenileme:</strong> {selectedContract.autoRenew ? '✅ Evet (Otomatik Uzatma)' : 'Hayır'}</p>
                  </div>

                  <div style={{ background: 'var(--surface-subtle)', padding: 14, borderRadius: 10 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>💳 Ödeme Koşulları</h4>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Ödeme Yöntemi:</strong> {selectedContract.paymentMethod}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Ödeme Şekli:</strong> {selectedContract.paymentTerms}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Fatura Dönemi:</strong> {selectedContract.billingCycle}</p>
                  </div>

                  <div style={{ background: 'var(--surface-subtle)', padding: 14, borderRadius: 10 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>📝 Onay ve Kabul Bilgileri</h4>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Kabul Kanalı:</strong> {selectedContract.acceptanceChannel || 'Belirtilmedi'}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Kabul Notu:</strong> {selectedContract.acceptanceNotes || 'Not bulunmuyor'}</p>
                    <p style={{ margin: '4px 0', fontSize: '0.84rem' }}><strong>Oluşturan:</strong> {selectedContract.owner}</p>
                  </div>
                </div>
              )}

              {/* TAB 2: SERVICES & LINE ITEM RENEWALS */}
              {detailTab === 'services' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Kalem Bazlı Hizmet Dökümü ve Yenileme Durumları</h4>
                  {selectedContract.revisions.length > 0 ? (
                    <div className="table-responsive">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left' }}>
                            <th style={{ padding: 8 }}>Hizmet Kalemi</th>
                            <th style={{ padding: 8 }}>Miktar / Birim</th>
                            <th style={{ padding: 8 }}>Birim Fiyat</th>
                            <th style={{ padding: 8 }}>Aylık Tutar</th>
                            <th style={{ padding: 8 }}>Yenileme Periyodu</th>
                            <th style={{ padding: 8 }}>Sonraki Yenileme</th>
                            <th style={{ padding: 8 }}>Durum Rozeti</th>
                            <th style={{ padding: 8, textAlign: 'right' }}>Aksiyon</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedContract.revisions[selectedContract.revisions.length - 1].services.map((srv) => {
                            const renewBadge = getLineRenewalStatus(srv.nextRenewalDate);
                            return (
                              <tr key={srv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: 8, fontWeight: 700, color: 'var(--text-main)' }}>{srv.serviceName}</td>
                                <td style={{ padding: 8 }}>{srv.quantity} {srv.unit}</td>
                                <td style={{ padding: 8 }}>₺{srv.unitPrice.toLocaleString('tr-TR')}</td>
                                <td style={{ padding: 8, fontWeight: 800 }}>₺{srv.lineTotal.toLocaleString('tr-TR')}</td>
                                <td style={{ padding: 8 }}>{srv.renewalPeriod || 'Yıllık'}</td>
                                <td style={{ padding: 8, fontWeight: 600 }}>{srv.nextRenewalDate || 'Tarih Yok'}</td>
                                <td style={{ padding: 8 }}>
                                  <span
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: 12,
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      background: renewBadge.bg,
                                      color: renewBadge.color
                                    }}
                                  >
                                    {renewBadge.label}
                                  </span>
                                </td>
                                <td style={{ padding: 8, textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRenewServiceLineDate(selectedContract.id, srv.id, 12)}
                                    style={{
                                      background: '#10b981',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    +1 Yıl Uzat
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 3: STAFF & ISG KATIP */}
              {detailTab === 'staff' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12 }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem' }}>👷 Atanan İSG Uzmanı</h4>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'block' }}>{selectedContract.assignedExpert || 'Uzman Atanmadı (Boş)'}</strong>
                  </div>

                  <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12 }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem' }}>🩺 Atanan İşyeri Hekimi</h4>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'block' }}>{selectedContract.assignedDoctor || 'Hekim Atanmadı (Boş)'}</strong>
                  </div>

                  <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12 }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem' }}>📋 İSG-Katip Sözleşme Numarası</h4>
                    <strong style={{ fontSize: '1rem', color: '#6366f1', display: 'block' }}>{selectedContract.isgKatipNo || 'İSG Katip No Girilmedi'}</strong>
                  </div>
                </div>
              )}

              {/* TAB 4: REVISION HISTORY & DIFF COMPARISON */}
              {detailTab === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedContract.revisions.map((rev, revIdx) => {
                    const prevRev = revIdx > 0 ? selectedContract.revisions[revIdx - 1] : null;
                    const isBulk = rev.revisionNotes && rev.revisionNotes.includes('Toplu Zam Motoru');
                    const isRenewal = rev.revisionNotes && rev.revisionNotes.includes('1 Yıllık Periyodik Sözleşme Yenileme');

                    let badgeLabel = '🔄 MANUEL REVİZYON / EK PROTOKOL';
                    let badgeBg = 'rgba(99, 102, 241, 0.12)';
                    let badgeColor = '#6366f1';

                    if (isBulk) {
                      badgeLabel = '⚡ TOPLU ZAM EK PROTOKOLÜ (Toplu Zam Motoru)';
                      badgeBg = 'rgba(245, 158, 11, 0.16)';
                      badgeColor = '#d97706';
                    } else if (isRenewal) {
                      badgeLabel = '⏰ PERİYODİK YENİLEME PROTOKOLÜ (1 Yıl Uzatma)';
                      badgeBg = 'rgba(16, 185, 129, 0.16)';
                      badgeColor = '#10b981';
                    }

                    return (
                      <details
                        key={rev.revisionNo}
                        open={revIdx === selectedContract.revisions.length - 1}
                        style={{
                          border: isBulk ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border)',
                          padding: 16,
                          borderRadius: 12,
                          background: isBulk ? 'rgba(245, 158, 11, 0.03)' : 'var(--surface-subtle)'
                        }}
                      >
                        <summary style={{ cursor: 'pointer', outline: 'none' }}>
                          <div style={{ display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center', width: '96%', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong style={{ fontSize: '0.96rem', color: 'var(--accent)' }}>
                                Revizyon #{rev.revisionNo} ({rev.revisionDate})
                              </strong>
                              <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 800, background: badgeBg, color: badgeColor }}>
                                {badgeLabel}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                                ₺{(rev.grandTotal || rev.subtotal || 0).toLocaleString('tr-TR')}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                                {rev.vatMode || selectedContract.vatMode || 'KDV Hariç'}
                              </span>
                            </div>
                          </div>
                          <p style={{ margin: '6px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                            📝 <strong>Revizyon Notu:</strong> {rev.revisionNotes} • 👤 <strong>Hazırlayan:</strong> {rev.preparedBy}
                          </p>
                        </summary>

                        {/* LINE BY LINE REVISION DIFF TABLE */}
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                          <ContractRevisionDiffView currentRev={rev} prevRev={prevRev} />
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setDetailModalOpen(false)}>
                  Kapat
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* FORMAL CONTRACT PDF PREVIEW MODAL */}
      <ContractPdfPreviewModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        contract={selectedContract}
        companyDisplayName={impersonatedTenant?.companyName}
        companyLogoUrl={impersonatedTenant?.logoUrl}
      />
    </section>
  );
}
