import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { offerSeeds } from '../../data/workbench';
import { contractSeeds } from '../../data/contractSeeds';
import {
  ContractRecord,
  ContractRevision,
  ContractServiceLine,
  OfferRecord,
  OfferRevision,
  OfferServiceLine,
  VatMode,
  PriceList
} from '../../types';
import { fetchCloudPriceRules, saveCloudPriceRules, fetchCloudPriceLists, saveCloudPriceLists } from '../../lib/cloudDb';
import { computeOfferFinancials } from './CustomersPage';


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

export type DangerClass = 'Az Tehlikeli' | 'Tehlikeli' | 'Çok Tehlikeli';

export type PriceRule = {
  id: string;
  danger_class: DangerClass;
  min_emp: number;
  max_emp: number | null;
  service_name: string;
  price: number;
  price_list_id?: string;
};

export type PriceHistoryLog = {
  id: string;
  changed_at: string;
  service_name: string;
  danger_class: string;
  min_emp: number;
  max_emp: number | null;
  old_price: number;
  new_price: number;
  changed_by: string;
};

const STORAGE_KEY = 'crm_price_list_v2';
const HISTORY_STORAGE_KEY = 'crm_price_history_v2';

export function findPriceRuleConflicts(rules: PriceRule[]) {
  const conflictIds = new Set<string>();
  const conflictMessages: string[] = [];

  for (let i = 0; i < rules.length; i++) {
    const a = rules[i];
    const nameA = a.service_name.trim().toLowerCase();
    if (!nameA) continue;

    const minA = Number(a.min_emp) || 1;
    const maxA = a.max_emp !== null && a.max_emp !== undefined ? Number(a.max_emp) : Infinity;

    for (let j = i + 1; j < rules.length; j++) {
      const b = rules[j];
      const nameB = b.service_name.trim().toLowerCase();
      if (!nameB) continue;

      if (a.danger_class === b.danger_class && nameA === nameB) {
        const minB = Number(b.min_emp) || 1;
        const maxB = b.max_emp !== null && b.max_emp !== undefined ? Number(b.max_emp) : Infinity;

        // Overlap condition: minA <= maxB && minB <= maxA
        if (minA <= maxB && minB <= maxA) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
          const rangeAStr = `${minA}-${maxA === Infinity ? 'Sınırsız' : maxA}`;
          const rangeBStr = `${minB}-${maxB === Infinity ? 'Sınırsız' : maxB}`;
          const msg = `"${a.danger_class} · ${a.service_name.trim()}" için (${rangeAStr}) ile (${rangeBStr}) kadro aralıkları çakışıyor!`;
          if (!conflictMessages.includes(msg)) {
            conflictMessages.push(msg);
          }
        }
      }
    }
  }

  return { conflictIds, conflictMessages };
}

export const defaultPriceRules: Omit<PriceRule, 'id'>[] = [
  // Az Tehlikeli
  { danger_class: 'Az Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'İSG Uzmanı', price: 120 },
  { danger_class: 'Az Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'İşyeri Hekimi', price: 150 },
  { danger_class: 'Az Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'DSP (Diğer Sağlık Personeli)', price: 80 },
  
  { danger_class: 'Az Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'İSG Uzmanı', price: 100 },
  { danger_class: 'Az Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'İşyeri Hekimi', price: 130 },
  { danger_class: 'Az Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'DSP (Diğer Sağlık Personeli)', price: 70 },

  { danger_class: 'Az Tehlikeli', min_emp: 100, max_emp: null, service_name: 'İSG Uzmanı', price: 80 },
  { danger_class: 'Az Tehlikeli', min_emp: 100, max_emp: null, service_name: 'İşyeri Hekimi', price: 110 },
  { danger_class: 'Az Tehlikeli', min_emp: 100, max_emp: null, service_name: 'DSP (Diğer Sağlık Personeli)', price: 60 },

  // Tehlikeli
  { danger_class: 'Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'İSG Uzmanı', price: 160 },
  { danger_class: 'Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'İşyeri Hekimi', price: 200 },
  { danger_class: 'Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'DSP (Diğer Sağlık Personeli)', price: 100 },
  
  { danger_class: 'Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'İSG Uzmanı', price: 140 },
  { danger_class: 'Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'İşyeri Hekimi', price: 180 },
  { danger_class: 'Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'DSP (Diğer Sağlık Personeli)', price: 90 },

  { danger_class: 'Tehlikeli', min_emp: 100, max_emp: null, service_name: 'İSG Uzmanı', price: 120 },
  { danger_class: 'Tehlikeli', min_emp: 100, max_emp: null, service_name: 'İşyeri Hekimi', price: 160 },
  { danger_class: 'Tehlikeli', min_emp: 100, max_emp: null, service_name: 'DSP (Diğer Sağlık Personeli)', price: 80 },

  // Çok Tehlikeli
  { danger_class: 'Çok Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'İSG Uzmanı', price: 220 },
  { danger_class: 'Çok Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'İşyeri Hekimi', price: 280 },
  { danger_class: 'Çok Tehlikeli', min_emp: 1, max_emp: 49, service_name: 'DSP (Diğer Sağlık Personeli)', price: 120 },
  
  { danger_class: 'Çok Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'İSG Uzmanı', price: 200 },
  { danger_class: 'Çok Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'İşyeri Hekimi', price: 250 },
  { danger_class: 'Çok Tehlikeli', min_emp: 50, max_emp: 99, service_name: 'DSP (Diğer Sağlık Personeli)', price: 110 },

  { danger_class: 'Çok Tehlikeli', min_emp: 100, max_emp: null, service_name: 'İSG Uzmanı', price: 180 },
  { danger_class: 'Çok Tehlikeli', min_emp: 100, max_emp: null, service_name: 'İşyeri Hekimi', price: 220 },
  { danger_class: 'Çok Tehlikeli', min_emp: 100, max_emp: null, service_name: 'DSP (Diğer Sağlık Personeli)', price: 100 },

  // Diğer Genel Hizmetler
  { danger_class: 'Az Tehlikeli', min_emp: 1, max_emp: null, service_name: 'Eğitim Hizmetleri (Yıllık Paket)', price: 3500 },
  { danger_class: 'Tehlikeli', min_emp: 1, max_emp: null, service_name: 'Eğitim Hizmetleri (Yıllık Paket)', price: 4500 },
  { danger_class: 'Çok Tehlikeli', min_emp: 1, max_emp: null, service_name: 'Eğitim Hizmetleri (Yıllık Paket)', price: 6000 },

  { danger_class: 'Az Tehlikeli', min_emp: 1, max_emp: null, service_name: 'Risk Analizi ve Değerlendirme', price: 5000 },
  { danger_class: 'Tehlikeli', min_emp: 1, max_emp: null, service_name: 'Risk Analizi ve Değerlendirme', price: 7000 },
  { danger_class: 'Çok Tehlikeli', min_emp: 1, max_emp: null, service_name: 'Risk Analizi ve Değerlendirme', price: 9500 }
];

const initialHistorySeeds: PriceHistoryLog[] = [
  { id: 'hist-1', changed_at: '2026-07-01 10:30', service_name: 'İSG Uzmanı', danger_class: 'Çok Tehlikeli', min_emp: 1, max_emp: 49, old_price: 200, new_price: 220, changed_by: 'Ayşe Yılmaz (Sistem Yöneticisi)' },
  { id: 'hist-2', changed_at: '2026-06-15 14:20', service_name: 'İşyeri Hekimi', danger_class: 'Tehlikeli', min_emp: 50, max_emp: 99, old_price: 160, new_price: 180, changed_by: 'Mert Demir (CRM Sorumlusu)' },
  { id: 'hist-3', changed_at: '2026-05-10 09:15', service_name: 'Risk Analizi ve Değerlendirme', danger_class: 'Az Tehlikeli', min_emp: 1, max_emp: null, old_price: 4500, new_price: 5000, changed_by: 'Ayşe Yılmaz (Sistem Yöneticisi)' }
];

export function PriceListsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [newListForm, setNewListForm] = useState<{
    name: string;
    action: 'empty' | 'copy';
    sourceListId: string;
    modifier: number;
  }>({ name: '', action: 'empty', sourceListId: '', modifier: 0 });

  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [lastSavedRules, setLastSavedRules] = useState<PriceRule[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryLog[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filters & Search & Sort
  const [filterDanger, setFilterDanger] = useState<string>('Tümü');
  const [searchService, setSearchService] = useState<string>('');
  const [sortKey, setSortKey] = useState<'danger_class' | 'min_emp' | 'service_name' | 'price' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: 'danger_class' | 'min_emp' | 'service_name' | 'price') => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortIcon = (key: 'danger_class' | 'min_emp' | 'service_name' | 'price') => {
    if (sortKey !== key) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return sortDirection === 'asc' ? <span style={{ marginLeft: 4 }}>▲</span> : <span style={{ marginLeft: 4 }}>▼</span>;
  };

  // Bulk Increase State
  const [bulkPercent, setBulkPercent] = useState<string>('');
  const [bulkApplyPrice, setBulkApplyPrice] = useState<boolean>(false);
  const [bulkApplyContracts, setBulkApplyContracts] = useState<boolean>(false);
  const [bulkApplyOffers, setBulkApplyOffers] = useState<boolean>(false);

  // Auto-Save State & Ref
  const [autoSaveTime, setAutoSaveTime] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Notice & History Modal
  const [statusNotice, setStatusNotice] = useState<{ message: string; type: 'ok' | 'err' | 'warn' } | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Load Initial Data from Cloud DB
  useEffect(() => {
    async function loadCloudRules() {
      const lists = await fetchCloudPriceLists();
      if (lists.length === 0) {
        // Create default list locally if none exists
        const defaultList: PriceList = {
          id: 'default-list',
          name: 'Genel Fiyat Listesi',
          description: 'Sistemdeki standart fiyat listesi',
          is_default: true,
          created_at: new Date().toISOString()
        };
        lists.push(defaultList);
        await saveCloudPriceLists(lists);
      }
      setPriceLists(lists);
      const defaultId = lists.find(l => l.is_default)?.id || lists[0].id;
      setActiveListId(defaultId);

      const defaults = defaultPriceRules.map((r, i) => ({ ...r, id: `rule-${i + 1}`, price_list_id: defaultId }));
      const dbRules = await fetchCloudPriceRules(defaults);
      setPriceRules(dbRules);
      setLastSavedRules(JSON.parse(JSON.stringify(dbRules)));
    }
    loadCloudRules();

    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        setPriceHistory(JSON.parse(savedHistory));
      } catch (e) {
        setPriceHistory(initialHistorySeeds);
      }
    } else {
      setPriceHistory(initialHistorySeeds);
    }
  }, []);

  // Automatic Persistence Effect (Cloud DB + Local Cache)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (priceRules.length === 0) return;

    // Save to Cloud DB & local cache
    saveCloudPriceRules(priceRules);

    // Update auto-save timestamp indicator
    const nowTimeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAutoSaveTime(nowTimeStr);


    // Auto-Log price change history
    const nowStr = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    const newHistoryLogs: PriceHistoryLog[] = [];

    priceRules.forEach((newR) => {
      const oldR = lastSavedRules.find(
        (o) =>
          o.id === newR.id ||
          (o.danger_class === newR.danger_class &&
            o.min_emp === newR.min_emp &&
            o.max_emp === newR.max_emp &&
            o.service_name.trim().toLowerCase() === newR.service_name.trim().toLowerCase())
      );

      if (oldR && Number(oldR.price) !== Number(newR.price) && newR.price >= 0) {
        newHistoryLogs.push({
          id: `hist-${Date.now()}-${Math.random()}`,
          changed_at: nowStr,
          service_name: newR.service_name.trim() || 'Hizmet',
          danger_class: newR.danger_class,
          min_emp: newR.min_emp,
          max_emp: newR.max_emp,
          old_price: Number(oldR.price),
          new_price: Number(newR.price),
          changed_by: 'Ayşe Yılmaz (Sistem Yöneticisi)'
        });
      }
    });

    if (newHistoryLogs.length > 0) {
      setPriceHistory((prev) => {
        const updated = [...newHistoryLogs, ...prev];
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setLastSavedRules(JSON.parse(JSON.stringify(priceRules)));
    }
  }, [priceRules]);

  const showStatus = (message: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
    setStatusNotice({ message, type });
    setTimeout(() => {
      setStatusNotice(null);
    }, 5000);
  };

  // Rule Handlers
  const handleUpdateRule = (id: string, key: keyof PriceRule, value: any) => {
    setPriceRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r))
    );
    setHasUnsavedChanges(true);
  };

  const handleAddNewRow = () => {
    const newRule: PriceRule = {
      id: `rule-${Date.now()}`,
      danger_class: 'Az Tehlikeli',
      min_emp: 1,
      max_emp: null,
      service_name: '',
      price: 0,
      price_list_id: activeListId || undefined
    };
    setPriceRules((prev) => [newRule, ...prev]);
    setHasUnsavedChanges(true);
  };

  const handleDeleteRow = (id: string) => {
    setPriceRules((prev) => prev.filter((r) => r.id !== id));
    setHasUnsavedChanges(true);
  };



  // Save Price List
  const handleSavePriceList = () => {
    // Validation
    for (let i = 0; i < priceRules.length; i++) {
      const r = priceRules[i];
      if (!r.service_name.trim()) {
        showStatus(`${i + 1}. satırdaki hizmet adı boş bırakılamaz!`, 'err');
        return;
      }
      if (r.max_emp !== null && r.min_emp > r.max_emp) {
        showStatus(`"${r.service_name}" için minimum çalışan sayısı maksimumdan büyük olamaz!`, 'err');
        return;
      }
    }

    // Log History Changes
    const nowStr = new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
    const newHistoryLogs: PriceHistoryLog[] = [];

    priceRules.forEach((newR) => {
      const oldR = lastSavedRules.find(
        (o) =>
          o.danger_class === newR.danger_class &&
          o.min_emp === newR.min_emp &&
          o.max_emp === newR.max_emp &&
          o.service_name.trim().toLowerCase() === newR.service_name.trim().toLowerCase()
      );

      if (oldR && Number(oldR.price) !== Number(newR.price)) {
        newHistoryLogs.push({
          id: `hist-${Date.now()}-${Math.random()}`,
          changed_at: nowStr,
          service_name: newR.service_name.trim(),
          danger_class: newR.danger_class,
          min_emp: newR.min_emp,
          max_emp: newR.max_emp,
          old_price: Number(oldR.price),
          new_price: Number(newR.price),
          changed_by: 'Ayşe Yılmaz (Sistem Yöneticisi)'
        });
      } else if (!oldR) {
        newHistoryLogs.push({
          id: `hist-${Date.now()}-${Math.random()}`,
          changed_at: nowStr,
          service_name: newR.service_name.trim(),
          danger_class: newR.danger_class,
          min_emp: newR.min_emp,
          max_emp: newR.max_emp,
          old_price: 0,
          new_price: Number(newR.price),
          changed_by: 'Ayşe Yılmaz (Sistem Yöneticisi)'
        });
      }
    });

    lastSavedRules.forEach((oldR) => {
      const stillExists = priceRules.some(
        (n) =>
          n.danger_class === oldR.danger_class &&
          n.min_emp === oldR.min_emp &&
          n.max_emp === oldR.max_emp &&
          n.service_name.trim().toLowerCase() === oldR.service_name.trim().toLowerCase()
      );
      if (!stillExists) {
        newHistoryLogs.push({
          id: `hist-${Date.now()}-${Math.random()}`,
          changed_at: nowStr,
          service_name: oldR.service_name.trim(),
          danger_class: oldR.danger_class,
          min_emp: oldR.min_emp,
          max_emp: oldR.max_emp,
          old_price: Number(oldR.price),
          new_price: 0,
          changed_by: 'Ayşe Yılmaz (Sistem Yöneticisi)'
        });
      }
    });

    const updatedHistory = [...newHistoryLogs, ...priceHistory];
    setPriceHistory(updatedHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(priceRules));
    setLastSavedRules(JSON.parse(JSON.stringify(priceRules)));
    setHasUnsavedChanges(false);

    showStatus(
      `✓ Fiyat listesi başarıyla kaydedildi. ${newHistoryLogs.length > 0 ? `${newHistoryLogs.length} adet fiyat değişimi tarihçeye loglandı.` : ''}`,
      'ok'
    );
  };

  // Bulk Increase Operation (3-Way: Price List, Active Contracts, Open Offers)
  const handleBulkIncreaseSubmit = () => {
    let pct = parseFloat(bulkPercent);
    if (isNaN(pct) || pct <= 0) {
      const promptVal = prompt('Lütfen uygulanacak toplu zam oranını (%) girin:');
      if (promptVal === null) return;
      pct = parseFloat(promptVal);
      if (isNaN(pct) || pct <= 0) {
        showStatus('Geçerli bir zam oranı girilmedi!', 'err');
        return;
      }
      setBulkPercent(String(pct));
    }

    if (!bulkApplyPrice && !bulkApplyContracts && !bulkApplyOffers) {
      showStatus('Lütfen en az bir hedef seçin (Fiyat listesi, Aktif sözleşmeler veya Teklifler).', 'warn');
      return;
    }

    const confirmLines = [`%${pct} oranında toplu zam operasyonu başlatılacaktır.`];
    if (bulkApplyPrice) confirmLines.push('• Fiyat listesi şablon kurallarındaki birim fiyatlar güncellenecek');
    if (bulkApplyContracts) confirmLines.push('• Aktif sözleşmelere otomatik zamlı Ek Protokol Revizyonu eklenecek');
    if (bulkApplyOffers) confirmLines.push('• Açık/güncel tekliflerde otomatik zamlı revizyon oluşturulacak');
    confirmLines.push('\nDevam etmek istiyor musunuz?');

    if (!confirm(confirmLines.join('\n'))) return;

    const results: string[] = [];

    // 1. PRICE RULES BULK UPDATE
    if (bulkApplyPrice) {
      let changedCount = 0;
      const updatedRules = priceRules.map((r) => {
        const oldP = Number(r.price || 0);
        const newP = Math.ceil(oldP * (1 + pct / 100));
        if (newP !== oldP) changedCount++;
        return { ...r, price: newP };
      });
      setPriceRules(updatedRules);
      if (changedCount > 0) setHasUnsavedChanges(true);
      results.push(`${changedCount} adet şablon fiyat kuralı güncellendi`);
    }

    // 2. CONTRACTS BULK REVISION UPDATE
    if (bulkApplyContracts) {
      try {
        const stored = localStorage.getItem('crm_contracts_v3');
        const allContracts: ContractRecord[] = stored ? JSON.parse(stored) : contractSeeds;

        let updatedCount = 0;
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

        const updatedContracts = allContracts.map((cnt) => {
          if (cnt.stage === 'Aktif' || cnt.stage === 'Onay Bekliyor' || cnt.stage === 'Yenilenecek') {
            const lastRev = cnt.revisions[cnt.revisions.length - 1];
            const newRevNo = cnt.currentRevisionNo + 1;
            const vMode = lastRev?.vatMode || cnt.vatMode || 'KDV Hariç';

            const updatedServices: ContractServiceLine[] = (lastRev?.services || []).map((s) => {
              const oldUnitP = Number(s.unitPrice) || 0;
              const newUnitP = Math.ceil(oldUnitP * (1 + pct / 100));
              const newTotal = Math.round((Number(s.quantity) || 1) * newUnitP);
              return {
                ...s,
                unitPrice: newUnitP,
                lineTotal: newTotal
              };
            });

            const financials = computeContractFinancialsLocal(updatedServices, vMode);

            const todayDateStr = new Date().toISOString().split('T')[0];
            const endCalc = new Date(todayDateStr);
            endCalc.setFullYear(endCalc.getFullYear() + 1);
            endCalc.setDate(endCalc.getDate() - 1);
            const calculatedEndDateStr = endCalc.toISOString().split('T')[0];

            const newRev: ContractRevision = {
              revisionNo: newRevNo,
              revisionDate: nowStr,
              preparedBy: 'Ayşe Yılmaz (Toplu Zam Motoru)',
              revisionNotes: `%${pct} Toplu TÜFE/ÜFE Fiyat Güncellemesi Ek Protokolü`,
              contractTitle: cnt.contractTitle,
              startDate: todayDateStr,
              endDate: calculatedEndDateStr,
              assignedExpert: cnt.assignedExpert,
              assignedDoctor: cnt.assignedDoctor,
              assignedDsp: cnt.assignedDsp,
              isgKatipNo: cnt.isgKatipNo,
              paymentMethod: cnt.paymentMethod,
              paymentTerms: cnt.paymentTerms,
              autoRenew: cnt.autoRenew,
              services: updatedServices,
              vatMode: vMode,
              ...financials
            };

            updatedCount++;
            return {
              ...cnt,
              startDate: todayDateStr,
              endDate: calculatedEndDateStr,
              currentRevisionNo: newRevNo,
              revisions: [...cnt.revisions, newRev]
            };
          }
          return cnt;
        });

        localStorage.setItem('crm_contracts_v3', JSON.stringify(updatedContracts));
        results.push(`${updatedCount} adet aktif sözleşmeye zamlı ek protokol revizyonu işlendi`);
      } catch (e) {
        console.error('Error during bulk contracts update', e);
      }
    }

    // 3. OFFERS BULK REVISION UPDATE
    if (bulkApplyOffers) {
      try {
        const stored = localStorage.getItem('crm_offers_v3');
        const allOffers: OfferRecord[] = stored ? JSON.parse(stored) : offerSeeds;

        let updatedCount = 0;
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

        const updatedOffers = allOffers.map((off) => {
          if (off.status !== 'Kazanıldı' && off.status !== 'Kaybedildi') {
            const lastRev = off.revisions[off.revisions.length - 1];
            const newRevNo = off.currentRevisionNo + 1;
            const vMode = off.vatMode || 'KDV Hariç';

            const updatedServices: OfferServiceLine[] = (lastRev?.services || []).map((s) => {
              const oldUnitP = Number(s.unitPrice) || 0;
              const newUnitP = Math.ceil(oldUnitP * (1 + pct / 100));
              const newTotal = Math.round((Number(s.quantity) || 1) * newUnitP);
              return {
                ...s,
                unitPrice: newUnitP,
                lineTotal: newTotal
              };
            });

            const totals = computeOfferFinancials(
              updatedServices,
              lastRev?.overallDiscountType || 'percent',
              lastRev?.overallDiscountValue || 0,
              vMode
            );

            const newRev: OfferRevision = {
              revisionNo: newRevNo,
              revisionDate: nowStr,
              preparedBy: 'Ayşe Yılmaz (Toplu Zam Motoru)',
              revisionNotes: `%${pct} Toplu Fiyat Güncellemesi Revizyonu`,
              services: updatedServices,
              overallDiscountType: lastRev?.overallDiscountType || 'percent',
              overallDiscountValue: lastRev?.overallDiscountValue || 0,
              ...totals
            };

            updatedCount++;
            return {
              ...off,
              currentRevisionNo: newRevNo,
              revisions: [...off.revisions, newRev]
            };
          }
          return off;
        });

        localStorage.setItem('crm_offers_v3', JSON.stringify(updatedOffers));
        results.push(`${updatedCount} adet güncel teklif zamlı revizyona geçirildi`);
      } catch (e) {
        console.error('Error during bulk offers update', e);
      }
    }

    setBulkPercent('');
    showStatus(`⚡ %${pct} toplu zam operasyonu başarıyla uygulandı (${results.join(' · ')}).`, 'ok');
  };

  // Bulk Action Button Dynamic Text
  const getBulkBtnText = () => {
    const selected: string[] = [];
    if (bulkApplyPrice) selected.push('Fiyat Listesi');
    if (bulkApplyContracts) selected.push('Aktif Sözleşmeler');
    if (bulkApplyOffers) selected.push('Açık Teklifler');

    if (selected.length === 0) return '⚠️ Hedef Seçin';
    return `⚡ ${selected.join(' + ')} Zam Uygula`;
  };

  // Filtered & Sorted Rules
  const activeRules = priceRules.filter((r) => r.price_list_id === activeListId || (!r.price_list_id && priceLists.find(l=>l.id === activeListId)?.is_default));

  const filteredRules = activeRules.filter((r) => {
    const dangerMatch = filterDanger === 'Tümü' || r.danger_class === filterDanger;
    const serviceMatch = !searchService || r.service_name.toLowerCase().includes(searchService.toLowerCase());
    return dangerMatch && serviceMatch;
  });

  const dangerOrder: Record<string, number> = {
    'Az Tehlikeli': 1,
    'Tehlikeli': 2,
    'Çok Tehlikeli': 3
  };

  const sortedRules = [...filteredRules].sort((a, b) => {
    if (!sortKey) return 0;

    let valA: any = 0;
    let valB: any = 0;

    if (sortKey === 'danger_class') {
      valA = dangerOrder[a.danger_class] || 0;
      valB = dangerOrder[b.danger_class] || 0;
    } else if (sortKey === 'min_emp') {
      valA = a.min_emp;
      valB = b.min_emp;
    } else if (sortKey === 'service_name') {
      valA = a.service_name.toLowerCase();
      valB = b.service_name.toLowerCase();
    } else if (sortKey === 'price') {
      valA = Number(a.price) || 0;
      valB = Number(b.price) || 0;
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Conflict & Overlap Detection
  const { conflictIds, conflictMessages } = useMemo(() => {
    return findPriceRuleConflicts(priceRules);
  }, [priceRules]);

  return (
    <section className="panel panel-wide panel-elevated page-layout" style={{ gap: 20 }}>
      {/* HEADER BAR */}
      <div className="section-heading" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            💰 Fiyat Listesi Yönetimi
          </h3>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '6px 14px',
            borderRadius: 20,
            color: '#10b981',
            fontSize: '0.84rem',
            fontWeight: 700
          }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
            <span>⚡ Otomatik Kayıt Aktif {autoSaveTime ? `(Son: ${autoSaveTime})` : ''}</span>
          </div>
        </div>
      </div>

      {/* CONFLICT WARNING BANNER */}
      {conflictMessages.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          padding: '12px 18px',
          borderRadius: 12,
          color: '#ef4444'
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠️ KURAL ÇAKIŞMA UYARISI</span>
            <span className="mini-badge" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '2px 8px' }}>
              {conflictMessages.length} Adet Çakışma Tespit Edildi
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', lineHeight: 1.5 }}>
            {conflictMessages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* STATUS NOTICE BANNER */}
      {statusNotice && (
        <div style={{
          background: statusNotice.type === 'ok' ? 'rgba(16, 185, 129, 0.14)' : statusNotice.type === 'err' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(245, 158, 11, 0.14)',
          border: `1px solid ${statusNotice.type === 'ok' ? 'rgba(16, 185, 129, 0.35)' : statusNotice.type === 'err' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
          padding: '10px 16px',
          borderRadius: 10,
          color: statusNotice.type === 'ok' ? '#10b981' : statusNotice.type === 'err' ? '#ef4444' : '#f59e0b',
          fontWeight: 600,
          fontSize: '0.88rem'
        }}>
          {statusNotice.message}
        </div>
      )}

      {/* BULK OPERATION PANEL */}
      <div className="panel panel-elevated" style={{ padding: '12px 18px', background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Toplu Zam Oranı
              </span>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '2px 10px', width: 110, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)' }}>
                <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.9rem', marginRight: 4, userSelect: 'none' }}>%</span>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  max="500"
                  step="5"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.9rem', outline: 'none', padding: '5px 0', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, borderLeft: '1px solid var(--border)', paddingLeft: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.84rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={bulkApplyPrice}
                  onChange={(e) => setBulkApplyPrice(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer' }}
                />
                🏷️ Fiyat Listesine (Şablon) Uygula
              </label>

              <label style={{ fontSize: '0.84rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={bulkApplyContracts}
                  onChange={(e) => setBulkApplyContracts(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer' }}
                />
                📝 Aktif Sözleşmelere Zam Revizyonu Uygula (Ek Protokol)
              </label>

              <label style={{ fontSize: '0.84rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={bulkApplyOffers}
                  onChange={(e) => setBulkApplyOffers(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer' }}
                />
                📄 Açık/Güncel Tekliflerde Revizyon Oluştur
              </label>
            </div>
          </div>

          <button
            type="button"
            className="secondary-action"
            disabled={!bulkApplyPrice && !bulkApplyContracts && !bulkApplyOffers}
            onClick={handleBulkIncreaseSubmit}
            style={{
              background: 'rgba(245, 158, 11, 0.14)',
              color: '#d97706',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: '0.88rem'
            }}
          >
            {getBulkBtnText()}
          </button>
        </div>
      </div>

      {/* PRICE LISTS TABS */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 20, overflowX: 'auto', gap: 2 }}>
        {priceLists.map(list => {
          const isActive = activeListId === list.id;
          return (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: isActive ? 'var(--bg-main)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 800 : 600,
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                marginBottom: '-2px',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }}
            >
              {list.name} {list.is_default && <span style={{fontSize: '0.8rem', marginLeft: 4}}>⭐</span>}
            </button>
          );
        })}
        <button
          onClick={() => {
            setNewListForm({ name: '', action: 'empty', sourceListId: priceLists[0]?.id || '', modifier: 0 });
            setIsNewListModalOpen(true);
          }}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-main)',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>+</span> Yeni Liste Ekle
        </button>
      </div>

      {/* FILTER & TABLE CONTROLS BAR (SINGLE UNIFIED ROW) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flex: 1, minWidth: 320 }}>
          <label className="select-field" style={{ width: 140, margin: 0, flexShrink: 0 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tehlike Sınıfı</span>
            <select value={filterDanger} onChange={(e) => setFilterDanger(e.target.value)} style={{ padding: '7px 10px', fontSize: '0.86rem' }}>
              <option value="Tümü">Tümü</option>
              <option value="Az Tehlikeli">Az Tehlikeli</option>
              <option value="Tehlikeli">Tehlikeli</option>
              <option value="Çok Tehlikeli">Çok Tehlikeli</option>
            </select>
          </label>

          <label className="select-field" style={{ flex: 1, margin: 0 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Hizmet Adı Arama</span>
            <input
              type="text"
              placeholder="Örn: İSG Uzmanı..."
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              style={{ padding: '7px 12px', fontSize: '0.86rem', width: '100%' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="secondary-action" onClick={() => setIsHistoryModalOpen(true)} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            🕒 Fiyat Değişim Geçmişi ({priceHistory.length})
          </button>
          <button type="button" className="btn-action-primary" onClick={handleAddNewRow} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            ➕ Yeni Fiyat Kuralı Ekle
          </button>
        </div>
      </div>

      {/* PRICE RULES TABLE */}
      <div className="customer-table-wrap" style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid var(--border)' }}>
        <table className="customer-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ width: '170px', padding: '12px 14px' }}>
                <button
                  type="button"
                  onClick={() => handleSort('danger_class')}
                  style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                >
                  <span>Tehlike Sınıfı {sortIcon('danger_class')}</span>
                </button>
              </th>
              <th style={{ width: '240px', padding: '12px 14px' }}>
                <button
                  type="button"
                  onClick={() => handleSort('min_emp')}
                  style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                >
                  <span>Çalışan Kadrosu Aralığı {sortIcon('min_emp')}</span>
                </button>
              </th>
              <th style={{ padding: '12px 14px' }}>
                <button
                  type="button"
                  onClick={() => handleSort('service_name')}
                  style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                >
                  <span>Hizmet Adı (Formül & Şablon Eşleşmesi) {sortIcon('service_name')}</span>
                </button>
              </th>
              <th style={{ width: '150px', padding: '12px 14px', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => handleSort('price')}
                  style={{ background: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', marginLeft: 'auto' }}
                >
                  <span>Birim Fiyat {sortIcon('price')}</span>
                </button>
              </th>
              <th style={{ width: '60px', padding: '12px 14px', textAlign: 'center' }}>Sil</th>
            </tr>
          </thead>
          <tbody>
            {sortedRules.length > 0 ? (
              sortedRules.map((rule) => {
                const isConflict = conflictIds.has(rule.id);

                const dangerBg =
                  rule.danger_class === 'Az Tehlikeli'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : rule.danger_class === 'Tehlikeli'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)';

                const dangerColor =
                  rule.danger_class === 'Az Tehlikeli'
                    ? '#10b981'
                    : rule.danger_class === 'Tehlikeli'
                    ? '#f59e0b'
                    : '#ef4444';

                return (
                  <tr
                    key={rule.id}
                    className="customer-table-row"
                    style={isConflict ? { background: 'rgba(239, 68, 68, 0.08)', outline: '1px solid rgba(239, 68, 68, 0.45)' } : undefined}
                  >
                    {/* TEHLİKE SINIFI */}
                    <td style={{ padding: '8px 12px' }}>
                      <select
                        value={rule.danger_class}
                        onChange={(e) => handleUpdateRule(rule.id, 'danger_class', e.target.value as DangerClass)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          borderRadius: 8,
                          border: `1px solid ${dangerColor}40`,
                          background: dangerBg,
                          color: dangerColor,
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Az Tehlikeli">Az Tehlikeli</option>
                        <option value="Tehlikeli">Tehlikeli</option>
                        <option value="Çok Tehlikeli">Çok Tehlikeli</option>
                      </select>
                    </td>

                    {/* MIN - MAX ÇALIŞAN ARALIĞI */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-strong)', border: `1px solid ${isConflict ? 'rgba(239, 68, 68, 0.5)' : 'var(--border)'}`, borderRadius: 8, padding: '2px 8px', flex: 1, minWidth: 80 }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 4, userSelect: 'none' }}>Min</span>
                          <input
                            type="number"
                            min={1}
                            value={rule.min_emp}
                            onChange={(e) => handleUpdateRule(rule.id, 'min_emp', Number(e.target.value) || 1)}
                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 600, fontSize: '0.86rem', outline: 'none', padding: '4px 0' }}
                          />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700 }}>—</span>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-strong)', border: `1px solid ${isConflict ? 'rgba(239, 68, 68, 0.5)' : 'var(--border)'}`, borderRadius: 8, padding: '2px 8px', flex: 1.3, minWidth: 100 }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 4, userSelect: 'none' }}>Max</span>
                          <input
                            type="number"
                            min={1}
                            placeholder="Sınırsız"
                            value={rule.max_emp ?? ''}
                            onChange={(e) => handleUpdateRule(rule.id, 'max_emp', e.target.value ? Number(e.target.value) : null)}
                            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 600, fontSize: '0.86rem', outline: 'none', padding: '4px 0' }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* HİZMET ADI */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="text"
                          placeholder="Örn: İSG Uzmanı"
                          value={rule.service_name}
                          onChange={(e) => handleUpdateRule(rule.id, 'service_name', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 12px',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            borderRadius: 8,
                            border: `1px solid ${isConflict ? 'rgba(239, 68, 68, 0.6)' : 'var(--border)'}`,
                            background: 'var(--surface-strong)',
                            color: 'var(--text-main)',
                            outline: 'none'
                          }}
                        />
                        {isConflict && (
                          <span
                            className="mini-badge"
                            style={{ background: '#ef4444', color: '#fff', border: 'none', fontSize: '0.72rem', flexShrink: 0 }}
                            title="Aynı tehlike sınıfı ve hizmet adında çakışan kadro aralığı!"
                          >
                            ⚠️ Çakışma
                          </span>
                        )}
                      </div>
                    </td>

                    {/* BİRİM FİYAT (₺) */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 8, padding: '2px 10px' }}>
                        <span style={{ color: 'var(--good)', fontWeight: 800, fontSize: '0.9rem', marginRight: 4 }}>₺</span>
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={rule.price}
                          onChange={(e) => handleUpdateRule(rule.id, 'price', Number(e.target.value) || 0)}
                          style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: 'var(--good)',
                            fontSize: '0.92rem',
                            outline: 'none',
                            padding: '5px 0'
                          }}
                        />
                      </div>
                    </td>

                    {/* SİL BUTONU */}
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        title="Bu kuralı sil"
                        onClick={() => handleDeleteRow(rule.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 8,
                          color: '#ef4444',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          width: 32,
                          height: 32,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                  Kriterlere uygun fiyat kuralı bulunamadı. Yeni bir kural ekleyebilir veya varsayılan listeyi yükleyebilirsiniz.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW LIST MODAL */}
      {isNewListModalOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', zIndex: 99999,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }}
          >
            <div style={{ background: 'var(--surface-strong)', width: '100%', maxWidth: 500, borderRadius: 18, border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>Yeni Fiyat Listesi Oluştur</h3>
              
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Liste Adı</span>
                <input 
                  type="text" 
                  value={newListForm.name} 
                  onChange={(e) => setNewListForm({ ...newListForm, name: e.target.value })} 
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  placeholder="Örn: 2025 Kampanyası"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Oluşturma Yöntemi</span>
                <select 
                  value={newListForm.action} 
                  onChange={(e) => setNewListForm({ ...newListForm, action: e.target.value as any })}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                >
                  <option value="empty">Boş Liste Oluştur</option>
                  <option value="copy">Şuradan Kopyala</option>
                </select>
              </label>

              {newListForm.action === 'copy' && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Kopyalanacak Liste</span>
                    <select 
                      value={newListForm.sourceListId} 
                      onChange={(e) => setNewListForm({ ...newListForm, sourceListId: e.target.value })}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    >
                      {priceLists.map(list => (
                        <option key={list.id} value={list.id}>{list.name}</option>
                      ))}
                    </select>
                  </label>
                  
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Fiyat Değişimi (%)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="number" 
                        value={newListForm.modifier} 
                        onChange={(e) => setNewListForm({ ...newListForm, modifier: Number(e.target.value) })} 
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>%0 seçilirse birebir kopyalanır</span>
                    </div>
                  </label>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="secondary-action" onClick={() => setIsNewListModalOpen(false)}>İptal</button>
                <button type="button" className="btn-action-primary" onClick={() => {
                  if (!newListForm.name.trim()) return alert('Liste adı giriniz.');
                  
                  const newList: PriceList = {
                    id: `list-${Date.now()}`,
                    name: newListForm.name,
                    is_default: priceLists.length === 0,
                    created_at: new Date().toISOString()
                  };

                  const updatedLists = [...priceLists, newList];
                  setPriceLists(updatedLists);
                  saveCloudPriceLists(updatedLists);
                  setActiveListId(newList.id);

                  if (newListForm.action === 'copy' && newListForm.sourceListId) {
                    const sourceRules = priceRules.filter(r => r.price_list_id === newListForm.sourceListId || (!r.price_list_id && priceLists.find(l => l.id === newListForm.sourceListId)?.is_default));
                    const newRules = sourceRules.map(r => ({
                      ...r,
                      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                      price_list_id: newList.id,
                      price: newListForm.modifier !== 0 ? Math.round(r.price * (1 + (newListForm.modifier / 100))) : r.price
                    }));
                    
                    const combinedRules = [...priceRules, ...newRules];
                    setPriceRules(combinedRules);
                    saveCloudPriceRules(combinedRules);
                  }

                  setIsNewListModalOpen(false);
                }}>
                  Oluştur
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PRICE HISTORY MODAL (PORTAL) */}
      {isHistoryModalOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
            onClick={() => setIsHistoryModalOpen(false)}
          >
            <div
              style={{
                background: 'var(--surface-strong)',
                width: '100%',
                maxWidth: 820,
                maxHeight: '85vh',
                borderRadius: 18,
                border: '1px solid var(--border)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* MODAL HEADER */}
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>🕒 Fiyat Değişim Geçmişi ({priceHistory.length})</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Fiyat kurallarında yapılan tüm güncellemeler ve toplu zam kayıtları
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              {/* MODAL BODY TABLE */}
              <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                <table className="customer-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Tarih</th>
                      <th style={{ width: '25%' }}>Hizmet Adı</th>
                      <th style={{ width: '25%' }}>Kriterler</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Eski Fiyat</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Yeni Fiyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.length > 0 ? (
                      priceHistory.map((h) => {
                        const empRange = h.max_emp ? `${h.min_emp}-${h.max_emp}` : `${h.min_emp}+`;
                        const crit = `${h.danger_class} (${empRange} Personel)`;
                        return (
                          <tr key={h.id} className="customer-table-row">
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{h.changed_at}</td>
                            <td>
                              <strong style={{ fontSize: '0.88rem' }}>{h.service_name}</strong>
                            </td>
                            <td style={{ fontSize: '0.84rem' }}>{crit}</td>
                            <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>
                              ₺{Number(h.old_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>
                              ₺{Number(h.new_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                          Henüz kayıtlı fiyat değişim tarihi bulunmuyor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MODAL FOOTER */}
              <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--accent-soft)', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-action" onClick={() => setIsHistoryModalOpen(false)}>
                  Kapat
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
