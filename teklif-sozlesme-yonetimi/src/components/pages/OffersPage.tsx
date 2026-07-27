import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CustomerRecord, calculateIsgStatutoryHours, computeOfferFinancials } from './CustomersPage';
import { PriceRule } from './PriceListsPage';
import { OfferRecord, OfferRevision, OfferServiceLine, AcceptanceChannel, ContractRecord, ContractServiceLine, VatMode, SaaSTenant } from '../../types';
import { offerSeeds } from '../../data/workbench';
import { OfferPdfPreviewModal } from '../modals/PdfPreviewModals';

const LOCAL_STORAGE_KEY_OFFERS = 'crm_offers_v3';
const LOCAL_STORAGE_KEY_PRICE_RULES = 'crm_price_list_v2';

const statusBadges: Record<string, { bg: string; color: string; label: string }> = {
  'Taslak': { bg: 'rgba(148, 163, 184, 0.16)', color: '#64748b', label: '📝 Taslak' },
  'Hazırlanıyor': { bg: 'rgba(59, 130, 246, 0.16)', color: '#3b82f6', label: '⚙️ Hazırlanıyor' },
  'Onay Bekliyor': { bg: 'rgba(245, 158, 11, 0.16)', color: '#f59e0b', label: '⏳ Onay Bekliyor' },
  'Gönderildi': { bg: 'rgba(99, 102, 241, 0.16)', color: '#6366f1', label: '✉️ Gönderildi' },
  'Revizyon İstendi': { bg: 'rgba(236, 72, 153, 0.16)', color: '#ec4899', label: '🔄 Revizyon İstendi' },
  'Kazanıldı': { bg: 'rgba(16, 185, 129, 0.16)', color: '#10b981', label: '🏆 Kazanıldı (Sözleşme)' },
  'Kaybedildi': { bg: 'rgba(239, 68, 68, 0.16)', color: '#ef4444', label: '✕ Kaybedildi' }
};

interface OffersPageProps {
  customers?: CustomerRecord[];
  onContractCreated?: (contract: ContractRecord) => void;
  onNavigateToContracts?: () => void;
  impersonatedTenant?: SaaSTenant | null;
}

export function OffersPage({
  customers = [],
  onContractCreated,
  onNavigateToContracts,
  impersonatedTenant
}: OffersPageProps) {

  // Load offers state from localStorage
  const [offers, setOffers] = useState<OfferRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_OFFERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading offers from localStorage', e);
    }
    return offerSeeds;
  });

  // Load price rules from localStorage for auto-population
  const [priceRules] = useState<PriceRule[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PRICE_RULES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading price rules', e);
    }
    return [];
  });

  // Sync offers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_OFFERS, JSON.stringify(offers));
    } catch (e) {
      console.error('Error saving offers to localStorage', e);
    }
  }, [offers]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Tümü');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('Tümü');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);

  const [activeOfferForAction, setActiveOfferForAction] = useState<OfferRecord | null>(null);

  // Acceptance Modal Form State
  const [offerToAccept, setOfferToAccept] = useState<OfferRecord | null>(null);
  const [acceptanceChannel, setAcceptanceChannel] = useState<AcceptanceChannel>('WhatsApp');
  const [acceptanceNotes, setAcceptanceNotes] = useState('');
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractTitleInput, setContractTitleInput] = useState('');
  const [createdContractToast, setCreatedContractToast] = useState<{ show: boolean; contractTitle: string } | null>(null);

  // New Offer Form State (Req 1: services starts empty [])
  const [newOfferForm, setNewOfferForm] = useState<{
    customerName: string;
    subject: string;
    owner: string;
    validUntilDate: string;
    vatMode: VatMode;
    services: OfferServiceLine[];
    overallDiscountType: 'percent' | 'amount';
    overallDiscountValue: number;
    notes: string;
  }>({
    customerName: '',
    subject: '',
    owner: 'Ayşe Yılmaz',
    validUntilDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vatMode: 'KDV Hariç',
    services: [],
    overallDiscountType: 'percent',
    overallDiscountValue: 0,
    notes: ''
  });

  // Edit Offer Form State (Req 4: Edit saved offer)
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
    preparedBy: 'Ayşe Yılmaz',
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

  // Filter price list rules strictly by selected customer's hazard class & employee count
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

  // Helper to add item from Price List Dropdown to any services list
  const handleAddPriceRuleLine = (
    cName: string,
    currentServices: OfferServiceLine[],
    setServicesFn: (updated: OfferServiceLine[]) => void
  ) => {
    if (!selectedPriceRuleId) return;
    const rule = priceRules.find((r) => r.id === selectedPriceRuleId);
    if (!rule) return;

    const cust = customers.find((c) => c.name === cName);
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

  // Requirement 4: Open Edit Modal for a saved offer
  const handleOpenEditOffer = (off: OfferRecord) => {
    setActiveOfferForAction(off);
    const activeRev = off.revisions[off.revisions.length - 1];
    setEditOfferForm({
      subject: off.subject,
      owner: off.owner,
      status: off.status,
      validUntilDate: off.validUntilDate,
      vatMode: activeRev?.vatMode || off.vatMode || 'KDV Hariç',
      services: JSON.parse(JSON.stringify(activeRev ? activeRev.services : [])),
      overallDiscountType: activeRev?.overallDiscountType || 'percent',
      overallDiscountValue: activeRev?.overallDiscountValue || 0,
      notes: activeRev?.revisionNotes || ''
    });
    setSelectedPriceRuleId('');
    setEditModalOpen(true);
  };

  // --- SAVE NEW OFFER ---
  const handleSaveNewOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferForm.customerName || !newOfferForm.subject) return;

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
      services: newOfferForm.services,
      overallDiscountType: newOfferForm.overallDiscountType,
      overallDiscountValue: newOfferForm.overallDiscountValue,
      vatMode: newOfferForm.vatMode,
      ...totals
    };

    const newRecord: OfferRecord = {
      id: `off-${Date.now()}`,
      offerNo,
      customerName: newOfferForm.customerName,
      subject: newOfferForm.subject,
      status: 'Gönderildi',
      currentRevisionNo: 0,
      createdDate: new Date().toISOString().split('T')[0],
      validUntilDate: newOfferForm.validUntilDate,
      owner: newOfferForm.owner,
      vatMode: newOfferForm.vatMode,
      revisions: [firstRevision]
    };

    setOffers([newRecord, ...offers]);
    setCreateModalOpen(false);
  };

  // --- SAVE EDITED OFFER (REQ 4) ---
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
              services: editOfferForm.services,
              overallDiscountType: editOfferForm.overallDiscountType,
              overallDiscountValue: editOfferForm.overallDiscountValue,
              vatMode: editOfferForm.vatMode,
              ...totals
            };
          }

          return {
            ...o,
            subject: editOfferForm.subject,
            owner: editOfferForm.owner,
            status: editOfferForm.status,
            validUntilDate: editOfferForm.validUntilDate,
            vatMode: editOfferForm.vatMode,
            revisions: updatedRevisions
          };
        }
        return o;
      })
    );

    setEditModalOpen(false);
  };

  // --- OPEN REVISION MODAL ---
  const handleOpenCreateRevision = (off: OfferRecord) => {
    setActiveOfferForAction(off);
    const activeRev = off.revisions[off.revisions.length - 1];
    setRevisionForm({
      preparedBy: off.owner,
      revisionNotes: '',
      vatMode: activeRev?.vatMode || off.vatMode || 'KDV Hariç',
      services: JSON.parse(JSON.stringify(activeRev ? activeRev.services : [])),
      overallDiscountType: activeRev?.overallDiscountType || 'percent',
      overallDiscountValue: activeRev?.overallDiscountValue || 0
    });
    setSelectedPriceRuleId('');
    setRevisionModalOpen(true);
  };

  // --- SAVE NEW REVISION ---
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
      services: revisionForm.services,
      overallDiscountType: revisionForm.overallDiscountType,
      overallDiscountValue: revisionForm.overallDiscountValue,
      vatMode: revisionForm.vatMode,
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

  // Update offer status quick handler
  const handleUpdateStatus = (offerId: string, newStatus: OfferRecord['status']) => {
    if (newStatus === 'Kazanıldı') {
      const off = offers.find((o) => o.id === offerId);
      if (off) {
        setOfferToAccept(off);
        setContractTitleInput(`${off.customerName} - ${off.subject}`);
        setContractStartDate(new Date().toISOString().split('T')[0]);
        setAcceptanceNotes('');
        setAcceptanceChannel('WhatsApp');
        setAcceptanceModalOpen(true);
        return;
      }
    }

    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: newStatus } : o))
    );
  };

  const handleConfirmAcceptanceAndCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerToAccept) return;

    // Update offer status to Kazanıldı
    setOffers((prev) =>
      prev.map((o) => (o.id === offerToAccept.id ? { ...o, status: 'Kazanıldı' } : o))
    );

    const activeRev = offerToAccept.revisions[offerToAccept.revisions.length - 1];
    const mappedServices: ContractServiceLine[] = (activeRev ? activeRev.services : []).map((s) => ({
      ...s,
      renewalPeriod: s.renewalPeriod || 'Yıllık',
      nextRenewalDate: s.nextRenewalDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));

    const vMode: VatMode = offerToAccept.vatMode || activeRev?.vatMode || 'KDV Hariç';
    const financials = computeOfferFinancials(
      activeRev?.services || [],
      activeRev?.overallDiscountType,
      activeRev?.overallDiscountValue,
      vMode
    );

    const endDate = new Date(new Date(contractStartDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newContract: ContractRecord = {
      id: `cnt-rec-${Date.now()}`,
      contractNo: `SZL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      contractTitle: contractTitleInput || `${offerToAccept.customerName} - ${offerToAccept.subject}`,
      customerName: offerToAccept.customerName,
      stage: 'Aktif',
      offerId: offerToAccept.id,
      offerNo: offerToAccept.offerNo,
      acceptanceChannel,
      acceptanceNotes,
      startDate: contractStartDate,
      endDate,
      currentRevisionNo: 0,
      createdDate: new Date().toISOString().split('T')[0],
      owner: offerToAccept.owner,
      vatMode: vMode,
      assignedExpert: `${offerToAccept.owner} (A Sınıfı Uzman)`,
      assignedDoctor: 'Dr. Mehmet Öz (İşyeri Hekimi)',
      assignedDsp: 'Hemşire Fatma Yıldız',
      isgKatipNo: `KTP-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      paymentMethod: 'Banka Havalesi / EFT',
      paymentTerms: 'Aylık Düzenli Fatura',
      billingCycle: 'Aylık',
      autoRenew: true,
      notes: acceptanceNotes ? `Kabul Notu: ${acceptanceNotes}` : undefined,
      revisions: [
        {
          revisionNo: 0,
          revisionDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
          preparedBy: offerToAccept.owner,
          revisionNotes: `Teklif ${offerToAccept.offerNo} (${acceptanceChannel}) üzerinden onaylanarak sözleşmeye dönüştürüldü.`,
          contractTitle: contractTitleInput || `${offerToAccept.customerName} - ${offerToAccept.subject}`,
          startDate: contractStartDate,
          endDate,
          assignedExpert: `${offerToAccept.owner} (A Sınıfı Uzman)`,
          assignedDoctor: 'Dr. Mehmet Öz (İşyeri Hekimi)',
          assignedDsp: 'Hemşire Fatma Yıldız',
          isgKatipNo: `KTP-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          paymentMethod: 'Banka Havalesi / EFT',
          paymentTerms: 'Aylık Düzenli Fatura',
          autoRenew: true,
          services: mappedServices,
          vatMode: vMode,
          ...financials
        }
      ]
    };

    if (onContractCreated) {
      onContractCreated(newContract);
    }

    setCreatedContractToast({ show: true, contractTitle: newContract.contractTitle });
    setAcceptanceModalOpen(false);
  };


  // Filtered Offers
  const filteredOffers = useMemo(() => {
    return offers.filter((off) => {
      const matchSearch =
        !searchQuery ||
        off.offerNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        off.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        off.subject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = selectedStatusFilter === 'Tümü' || off.status === selectedStatusFilter;
      const matchCustomer = selectedCustomerFilter === 'Tümü' || off.customerName === selectedCustomerFilter;

      return matchSearch && matchStatus && matchCustomer;
    });
  }, [offers, searchQuery, selectedStatusFilter, selectedCustomerFilter]);

  // KPI Metrics
  const kpiStats = useMemo(() => {
    let totalVal = 0;
    let wonVal = 0;
    let revCount = 0;

    offers.forEach((o) => {
      const currentRev = o.revisions[o.revisions.length - 1];
      const val = currentRev ? currentRev.grandTotal : 0;
      totalVal += val;

      if (o.status === 'Kazanıldı') wonVal += val;
      if (o.revisions.length > 1) revCount++;
    });

    return {
      totalCount: offers.length,
      totalValue: totalVal,
      wonValue: wonVal,
      revisedCount: revCount
    };
  }, [offers]);

  return (
    <section className="panel panel-wide panel-elevated page-layout" style={{ gap: 20 }}>
      {/* HEADER BAR */}
      <div className="section-heading" style={{ flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            📑 Teklifler & Revizyon Yönetimi
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Müşterilerinize özel çoklu teklifler hazırlayın, fiyat listesinden kalem seçin ve revizyonları takip edin.
          </span>
        </div>

        <button
          type="button"
          className="btn-action-primary"
          onClick={() => {
            setNewOfferForm({
              customerName: customers.length > 0 ? customers[0].name : '',
              subject: '',
              owner: 'Ayşe Yılmaz',
              validUntilDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              vatMode: 'KDV Hariç',
              services: [], // REQ 1: Kalemler boş başlayacak!
              overallDiscountType: 'percent',
              overallDiscountValue: 0,
              notes: ''
            });
            setSelectedPriceRuleId('');
            setCreateModalOpen(true);
          }}
          style={{ padding: '9px 18px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          + Yeni Teklif Oluştur
        </button>
      </div>

      {/* KPI METRICS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="panel panel-elevated" style={{ padding: '16px 20px', background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Toplam Teklif Adedi</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 4 }}>
            {kpiStats.totalCount} <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Teklif</span>
          </div>
        </div>

        <div className="panel panel-elevated" style={{ padding: '16px 20px', background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Aktif Teklif Hacmi</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
            ₺{kpiStats.totalValue.toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="panel panel-elevated" style={{ padding: '16px 20px', background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Kazanılan Teklif Tutarı</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
            ₺{kpiStats.wonValue.toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="panel panel-elevated" style={{ padding: '16px 20px', background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Revizyon Gören Teklifler</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ec4899', marginTop: 4 }}>
            {kpiStats.revisedCount} <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Sözleşme Adayı</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', background: 'var(--surface-subtle)', padding: 14, borderRadius: 14, border: '1px solid var(--border)' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <input
            type="text"
            placeholder="🔍 Teklif no, konu veya müşteri adı ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
          />
        </div>

        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.86rem' }}
        >
          <option value="Tümü">Tüm Durumlar</option>
          <option value="Taslak">📝 Taslak</option>
          <option value="Gönderildi">✉️ Gönderildi</option>
          <option value="Revizyon İstendi">🔄 Revizyon İstendi</option>
          <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
          <option value="Kazanıldı">🏆 Kazanıldı</option>
          <option value="Kaybedildi">✕ Kaybedildi</option>
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

      {/* OFFERS DATA TABLE */}
      <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px 16px' }}>Teklif No</th>
              <th style={{ padding: '12px 16px' }}>Müşteri & Konu</th>
              <th style={{ padding: '12px 16px' }}>Revizyon</th>
              <th style={{ padding: '12px 16px' }}>Tutar (KDV Dahil)</th>
              <th style={{ padding: '12px 16px' }}>Geçerlilik</th>
              <th style={{ padding: '12px 16px' }}>Durum</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filteredOffers.length > 0 ? (
              filteredOffers.map((off) => {
                const currentRev = off.revisions[off.revisions.length - 1];
                const badge = statusBadges[off.status] || statusBadges['Taslak'];

                return (
                  <tr key={off.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--accent)' }}>
                      {off.offerNo}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.92rem' }}>{off.customerName}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{off.subject}</span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
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

                    <td style={{ padding: '12px 16px' }}>
                      {(() => {
                        const vMode = off.vatMode || currentRev?.vatMode || 'KDV Hariç';
                        const grandT = currentRev ? currentRev.grandTotal : 0;
                        const subT = currentRev ? currentRev.subtotal : 0;

                        if (vMode === 'KDV Dahil') {
                          return (
                            <>
                              <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', display: 'block' }}>
                                ₺{grandT.toLocaleString('tr-TR')}
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
                                ₺{subT.toLocaleString('tr-TR')}
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
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      📅 {off.validUntilDate}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={off.status}
                        onChange={(e) => handleUpdateStatus(off.id, e.target.value as any)}
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: '0.8rem',
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

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* REQ 4: Kaydedilmiş teklifi düzenleme butonu */}
                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          onClick={() => handleOpenEditOffer(off)}
                          title="Teklifi Düzenle"
                        >
                          ✏️ Düzenle
                        </button>

                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          onClick={() => handleOpenCreateRevision(off)}
                          title="Yeni Revizyon Oluştur"
                        >
                          🔄 Revizyon Yap
                        </button>

                        <button
                          type="button"
                          className="btn-action-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          onClick={() => {
                            setActiveOfferForAction(off);
                            setPreviewModalOpen(true);
                          }}
                          title="Resmi Teklif Formunu Önizle"
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
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Arama kriterlerinize uygun teklif bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: CREATE NEW OFFER */}
      {createModalOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999, background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(12px)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto'
            }}
            onClick={() => setCreateModalOpen(false)}
          >
            <div
              style={{
                maxWidth: 880, width: '100%',
                background: 'var(--surface-strong)', border: '1px solid var(--border-strong)',
                borderRadius: '20px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>📑 Yeni Hizmet & Fiyat Teklifi</h3>
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
                      <span>Müşteri Seçin *</span>
                      <select
                        required
                        value={newOfferForm.customerName}
                        onChange={(e) => {
                          const cName = e.target.value;
                          setNewOfferForm((prev) => ({
                            ...prev,
                            customerName: cName,
                            subject: prev.subject || `${cName} - 2026 Hizmet Teklifi`
                          }));
                        }}
                      >
                        <option value="">-- Firma Seçin --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
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
                    const selCust = customers.find((c) => c.name === newOfferForm.customerName);
                    if (!selCust) {
                      return (
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                          ℹ️ Yukarıdaki Müşteri Seçin alanından firma seçtiğinizde yasal İSG süre ve tehlike sınıfı parametreleri burada görüntülenecektir.
                        </p>
                      );
                    }
                    const stat = calculateIsgStatutoryHours(selCust.employeeCount || 0, selCust.hazardClass || 'Tehlikeli');
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Tehlike Sınıfı</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{selCust.hazardClass}</strong>
                        </div>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Çalışan Sayısı</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{selCust.employeeCount} Kişi</strong>
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
                        {(() => {
                          const availRules = getFilteredPriceRulesForCustomer(newOfferForm.customerName);
                          return (
                            <select
                              value={selectedPriceRuleId}
                              onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                              style={{ flex: 1, minWidth: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                            >
                              <option value="">
                                {newOfferForm.customerName
                                  ? `-- ${newOfferForm.customerName} İle Uyumlu Matris Hizmetleri (${availRules.length} Kalem) --`
                                  : `-- Firma Seçiniz (${priceRules.length} Kalem) --`}
                              </option>
                              {availRules.map((rule) => (
                                <option key={rule.id} value={rule.id}>
                                  {rule.service_name} — ₺{rule.price.toLocaleString('tr-TR')} ({rule.danger_class} / {rule.min_emp}-{rule.max_emp || '∞'} Kişi)
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                        <button
                          type="button"
                          className="btn-action-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#0d9488' }}
                          onClick={() => handleAddPriceRuleLine(newOfferForm.customerName, newOfferForm.services, (services) => setNewOfferForm((prev) => ({ ...prev, services })))}
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

                    {/* OVERALL DISCOUNT & TOTALS */}
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
                              <span style={{ fontSize: '0.78rem', color: isVatInclusive ? '#10b981' : 'var(--text-muted)', display: 'block', fontWeight: 700 }}>
                                TEKLİF GENEL TOPLAMI ({isVatInclusive ? 'KDV DAHİL' : 'KDV HARİÇ MATRAH + KDV'})
                              </span>
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

      {/* MODAL 2: EDIT SAVED OFFER (REQ 4) */}
      {editModalOpen && activeOfferForAction &&
        createPortal(
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999, background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(12px)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto'
            }}
            onClick={() => setEditModalOpen(false)}
          >
            <div
              style={{
                maxWidth: 880, width: '100%',
                background: 'var(--surface-strong)', border: '1px solid var(--border-strong)',
                borderRadius: '20px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20
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
                    const selCust = customers.find((c) => c.name === activeOfferForAction.customerName);
                    if (!selCust) {
                      return (
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                          ℹ️ Firma kayıtlarında teşhis bilgisi bulunamadı.
                        </p>
                      );
                    }
                    const stat = calculateIsgStatutoryHours(selCust.employeeCount || 0, selCust.hazardClass || 'Tehlikeli');
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Tehlike Sınıfı</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{selCust.hazardClass}</strong>
                        </div>
                        <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Çalışan Sayısı</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{selCust.employeeCount} Kişi</strong>
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
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tutar Net (₺)</th>
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
                        {(() => {
                          const availRules = getFilteredPriceRulesForCustomer(activeOfferForAction.customerName);
                          return (
                            <select
                              value={selectedPriceRuleId}
                              onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                              style={{ flex: 1, minWidth: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                            >
                              <option value="">-- {activeOfferForAction.customerName} İle Uyumlu Matris Hizmetleri ({availRules.length} Kalem) --</option>
                              {availRules.map((rule) => (
                                <option key={rule.id} value={rule.id}>
                                  {rule.service_name} — ₺{rule.price.toLocaleString('tr-TR')} ({rule.danger_class} / {rule.min_emp}-{rule.max_emp || '∞'} Kişi)
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                        <button
                          type="button"
                          className="btn-action-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#0d9488' }}
                          onClick={() => handleAddPriceRuleLine(activeOfferForAction.customerName, editOfferForm.services, (services) => setEditOfferForm((prev) => ({ ...prev, services })))}
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
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Ara Toplam (Matrah): <strong>₺{totals.subtotal.toLocaleString('tr-TR')}</strong></span>
                                  {totals.discountTotal > 0 && <span style={{ fontSize: '0.84rem', color: '#ef4444' }}>Uygulanan Genel İskonto: <strong>-₺{totals.discountTotal.toLocaleString('tr-TR')}</strong></span>}
                                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Hesaplanan KDV Toplamı: <strong>₺{totals.taxAmount.toLocaleString('tr-TR')}</strong></span>
                                </>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.78rem', color: isVatInclusive ? '#10b981' : 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                                GÜNCELLENMİŞ TEKLİF TUTARI ({isVatInclusive ? 'KDV DAHİL' : 'KDV HARİÇ MATRAH + KDV'})
                              </span>
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
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999, background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(12px)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto'
            }}
            onClick={() => setRevisionModalOpen(false)}
          >
            <div
              style={{
                maxWidth: 880, width: '100%',
                background: 'var(--surface-strong)', border: '1px solid var(--border-strong)',
                borderRadius: '20px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20
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

                {/* EDITING REVISION SERVICE LINES */}
                <div>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', display: 'block', marginBottom: 10 }}>
                    📋 Revize Edilecek Kalemler ve Fiyatlar
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
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tutar Net (₺)</th>
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

                  {/* ADD ITEM DROPDOWN OR CUSTOM */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-subtle)', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>🏷️ Fiyat Listesinden Hizmet Seçin:</span>
                      {(() => {
                        const availRules = getFilteredPriceRulesForCustomer(activeOfferForAction.customerName);
                        return (
                          <select
                            value={selectedPriceRuleId}
                            onChange={(e) => setSelectedPriceRuleId(e.target.value)}
                            style={{ flex: 1, minWidth: 220, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.84rem' }}
                          >
                            <option value="">-- {activeOfferForAction.customerName} İle Uyumlu Matris Hizmetleri ({availRules.length} Kalem) --</option>
                            {availRules.map((rule) => (
                              <option key={rule.id} value={rule.id}>
                                {rule.service_name} — ₺{rule.price.toLocaleString('tr-TR')} ({rule.danger_class} / {rule.min_emp}-{rule.max_emp || '∞'} Kişi)
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                      <button
                        type="button"
                        className="btn-action-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        onClick={() => handleAddPriceRuleLine(activeOfferForAction.customerName, revisionForm.services, (services) => setRevisionForm((prev) => ({ ...prev, services })))}
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
                    <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>💰 Genel İskonto Güncelle</strong>
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
                          <span style={{ fontSize: '0.78rem', color: isVatInclusive ? '#10b981' : 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                            REVİZE TEKLİF TUTARI ({isVatInclusive ? 'KDV DAHİL' : 'KDV HARİÇ MATRAH + KDV'})
                          </span>
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

      {/* MODAL 4: REVISION HISTORY TIMELINE */}
      {historyModalOpen && activeOfferForAction &&
        createPortal(
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999, background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(12px)',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto'
            }}
            onClick={() => setHistoryModalOpen(false)}
          >
            <div
              style={{
                maxWidth: 880, width: '100%',
                background: 'var(--surface-strong)', border: '1px solid var(--border-strong)',
                borderRadius: '20px', boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
                padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20
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
                            <th style={{ padding: '6px 10px' }}>Hizmet Adı</th>
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
        companyDisplayName={impersonatedTenant?.companyName}
        companyLogoUrl={impersonatedTenant?.logoUrl}
      />

      {/* MODAL 6: OFFER ACCEPTANCE & AUTOMATIC CONTRACT GENERATION */}
      {acceptanceModalOpen && offerToAccept &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.7)',
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
                maxWidth: 620,
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>🏆 Teklifi Kabul Et & Sözleşmeye Dönüştür</h3>
                <button
                  type="button"
                  onClick={() => setAcceptanceModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                <strong>{offerToAccept.offerNo}</strong> teklifi kabul edildiğinde, teklif kalemleri ve fiyatlandırmasıyla otomatik olarak yeni bir aktif sözleşme oluşturulacaktır.
              </p>

              <form onSubmit={handleConfirmAcceptanceAndCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>
                    Sözleşme Takip Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractTitleInput}
                    onChange={(e) => setContractTitleInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>
                      Kabul Kanalı (Onay Yöntemi) *
                    </label>
                    <select
                      value={acceptanceChannel}
                      onChange={(e) => setAcceptanceChannel(e.target.value as AcceptanceChannel)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <option value="WhatsApp">💬 WhatsApp Onayı</option>
                      <option value="Sözlü Onay (Telefon)">📞 Sözlü Onay (Telefon)</option>
                      <option value="E-posta">✉️ E-posta Onayı</option>
                      <option value="Sistem Üzerinden">💻 Sistem Üzerinden</option>
                      <option value="Fiziki / Yazılı Onay">📝 Fiziki / Yazılı Onay Formu</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>
                      Sözleşme Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={contractStartDate}
                      onChange={(e) => setContractStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-main)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>
                    Kabul / Onay Açıklama Notu
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Örn: Murat Bey WhatsApp üzerinden revize fiyatı kabul ettiğini ve 1 Ağustos'ta başlamak istediğini belirtti."
                    value={acceptanceNotes}
                    onChange={(e) => setAcceptanceNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.86rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => setAcceptanceModalOpen(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn-action-primary" style={{ background: '#10b981' }}>
                    🏆 Kabul Et ve Sözleşmeyi Oluştur
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* TOAST: CONTRACT CREATED SUCCESSFULLY */}
      {createdContractToast && createdContractToast.show &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 10000,
              background: '#10b981',
              color: '#fff',
              padding: '14px 20px',
              borderRadius: 12,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 14
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>✅ Sözleşme Başarıyla Oluşturuldu!</strong>
              <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>"{createdContractToast.contractTitle}" sözleşmeler listesine eklendi.</span>
            </div>
            {onNavigateToContracts && (
              <button
                type="button"
                onClick={() => {
                  setCreatedContractToast(null);
                  onNavigateToContracts();
                }}
                style={{
                  background: '#fff',
                  color: '#10b981',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Sözleşmelere Git ➔
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreatedContractToast(null)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>,
          document.body
        )}
    </section>
  );
}

