import React, { useState, useRef } from 'react';
import type { CustomerRecord } from './CustomersPage';
import type { ContractRecord, OfferRecord } from '../../types';
import type { PriceRule } from './PriceListsPage';
import { DataImportWizardModal } from '../modals/DataImportWizardModal';

type ImportExportTabProps = {
  customers: CustomerRecord[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRecord[]>>;
  offers: OfferRecord[];
  setOffers: React.Dispatch<React.SetStateAction<OfferRecord[]>>;
  contracts: ContractRecord[];
  setContracts: React.Dispatch<React.SetStateAction<ContractRecord[]>>;
};

type ExportModule = 'customers' | 'offers' | 'contracts' | 'priceRules' | 'all';
type ExportFormat = 'json' | 'csv';
type MergePolicy = 'overwrite' | 'skip' | 'duplicate' | 'reset';

type ParsedAnalysis = {
  moduleType: ExportModule;
  totalCount: number;
  newRecords: any[];
  conflictingRecords: any[];
  invalidRecords: any[];
  rawParsedData: any[];
};

export function ImportExportTab({
  customers,
  setCustomers,
  offers,
  setOffers,
  contracts,
  setContracts
}: ImportExportTabProps) {
  // EXPORT STATE
  const [selectedExportModule, setSelectedExportModule] = useState<ExportModule>('all');
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat>('json');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // IMPORT STATE
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardFile, setWizardFile] = useState<File | null>(null);
  const [targetImportModule, setTargetImportModule] = useState<ExportModule>('customers');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ParsedAnalysis | null>(null);
  const [mergePolicy, setMergePolicy] = useState<MergePolicy>('overwrite');
  const [importStatusNotice, setImportStatusNotice] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // HELPER EXPORT FUNCTIONS
  // ==========================================

  const getPriceRules = (): PriceRule[] => {
    try {
      const saved = localStorage.getItem('crm_price_list_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const handleExportData = () => {
    const timeStr = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    let exportObj: any = {};
    let filename = `OSGB_Veri_Yedegi_${timeStr}`;

    if (selectedExportFormat === 'json') {
      if (selectedExportModule === 'all') {
        exportObj = {
          export_type: 'full_system_backup',
          exported_at: new Date().toISOString(),
          version: '2.0',
          data: {
            customers,
            offers,
            contracts,
            priceRules: getPriceRules()
          }
        };
        filename = `OSGB_Tam_Sistem_Yedegi_${timeStr}.json`;
      } else if (selectedExportModule === 'customers') {
        exportObj = { export_type: 'customers', exported_at: new Date().toISOString(), data: customers };
        filename = `Musteriler_Yedek_${timeStr}.json`;
      } else if (selectedExportModule === 'offers') {
        exportObj = { export_type: 'offers', exported_at: new Date().toISOString(), data: offers };
        filename = `Teklifler_Yedek_${timeStr}.json`;
      } else if (selectedExportModule === 'contracts') {
        exportObj = { export_type: 'contracts', exported_at: new Date().toISOString(), data: contracts };
        filename = `Sozlesmeler_Yedek_${timeStr}.json`;
      } else if (selectedExportModule === 'priceRules') {
        exportObj = { export_type: 'priceRules', exported_at: new Date().toISOString(), data: getPriceRules() };
        filename = `Fiyat_Listesi_Yedek_${timeStr}.json`;
      }

      const jsonStr = JSON.stringify(exportObj, null, 2);
      downloadBlob(jsonStr, filename, 'application/json');
      setExportNotice(`✅ ${filename} başarıyla indirildi (${(jsonStr.length / 1024).toFixed(1)} KB).`);
    } else {
      // CSV EXPORT
      let csvContent = '';
      if (selectedExportModule === 'customers') {
        csvContent = convertCustomersToCSV(customers);
        filename = `Musteriler_Listesi_${timeStr}.csv`;
      } else if (selectedExportModule === 'offers') {
        csvContent = convertOffersToCSV(offers);
        filename = `Teklifler_Listesi_${timeStr}.csv`;
      } else if (selectedExportModule === 'contracts') {
        csvContent = convertContractsToCSV(contracts);
        filename = `Sozlesmeler_Listesi_${timeStr}.csv`;
      } else if (selectedExportModule === 'priceRules') {
        csvContent = convertPriceRulesToCSV(getPriceRules());
        filename = `Fiyat_Listesi_${timeStr}.csv`;
      } else {
        // ALL to CSV -> Customer default
        csvContent = convertCustomersToCSV(customers);
        filename = `Musteriler_Toplu_${timeStr}.csv`;
      }

      downloadBlob('\uFEFF' + csvContent, filename, 'text/csv;charset=utf-8;');
      setExportNotice(`✅ ${filename} Excel uyumlu CSV olarak indirildi.`);
    }

    setTimeout(() => setExportNotice(null), 6000);
  };

  const downloadBlob = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV CONVERTERS (Covering ALL 28 fields of CustomerRecord)
  const convertCustomersToCSV = (list: CustomerRecord[]): string => {
    const headers = [
      'id', 'name', 'status', 'stage', 'owner', 'city', 'district', 'hazardClass', 'sector',
      'employeeCount', 'disabledEmployeeCount', 'specialGroupsNotes', 'contact', 'phone', 'email',
      'service', 'note', 'taxNo', 'taxOffice', 'naceCode', 'website', 'address', 'leadSource',
      'visitFrequency', 'needsAnalysisNotes', 'locationCount', 'shiftStructure', 'expertClassNeed',
      'doctorMonthlyHours', 'expertMonthlyHours'
    ];

    const rows = list.map((c) =>
      headers.map((h) => {
        const val = (c as any)[h];
        if (val === undefined || val === null) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(';')
    );

    return [headers.join(';'), ...rows].join('\r\n');
  };

  const convertOffersToCSV = (list: OfferRecord[]): string => {
    const headers = ['id', 'offerNo', 'customerName', 'subject', 'status', 'validUntilDate', 'owner', 'createdDate', 'currentRevisionNo'];
    const rows = list.map((o) =>
      headers.map((h) => {
        const val = (o as any)[h];
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(';')
    );
    return [headers.join(';'), ...rows].join('\r\n');
  };

  const convertContractsToCSV = (list: ContractRecord[]): string => {
    const headers = [
      'id', 'contractNo', 'customerName', 'contractTitle', 'stage', 'isgKatipNo',
      'assignedExpert', 'assignedDoctor', 'assignedDsp', 'startDate', 'endDate',
      'owner', 'paymentMethod', 'paymentTerms', 'billingCycle', 'autoRenew', 'vatMode', 'notes'
    ];
    const rows = list.map((c) =>
      headers.map((h) => {
        const val = (c as any)[h];
        return `"${String(val === undefined || val === null ? '' : val).replace(/"/g, '""')}"`;
      }).join(';')
    );
    return [headers.join(';'), ...rows].join('\r\n');
  };

  const convertPriceRulesToCSV = (list: PriceRule[]): string => {
    const headers = ['id', 'service_name', 'danger_class', 'min_emp', 'max_emp', 'price'];
    const rows = list.map((r) =>
      headers.map((h) => {
        const val = (r as any)[h];
        return `"${val === null || val === undefined ? '' : String(val).replace(/"/g, '""')}"`;
      }).join(';')
    );
    return [headers.join(';'), ...rows].join('\r\n');
  };

  // SAMPLE TEMPLATE DOWNLOADS
  const handleDownloadSampleCSV = (type: 'customers' | 'contracts' | 'offers' | 'priceRules') => {
    if (type === 'customers') {
      const sample = [
        'name;status;stage;owner;city;district;hazardClass;sector;employeeCount;contact;phone;email;taxNo;taxOffice;naceCode;address',
        '"Örnek Sanayi A.Ş.";"Aktif";"Kazanıldı";"Ayşe Yılmaz";"İstanbul";"Tuzla";"Çok Tehlikeli";"Metal & İmalat";50;"Ahmet Yılmaz (Genel Müdür); Mehmet Kaya (İSG Sorumlusu)";"05321002030; 05422003040";"ahmet@orneksanayi.com; mehmet@orneksanayi.com";"1234567890";"Tuzla V.D.";"25.11.01";"Tuzla Sanayi Bölgesi No:4"',
        '"Örnek Lojistik Ltd.";"Aday";"Teklif Verildi";"Mert Demir";"Kocaeli";"Gebze";"Tehlikeli";"Lojistik";25;"Ali Kaya (Operasyon Müdürü)";"05422003040";"ali@orneklosik.com";"9876543210";"Gebze V.D.";"52.29.01";"Gebze Organize Sanayi"'
      ].join('\r\n');
      downloadBlob('\uFEFF' + sample, 'Ornek_Musteri_Yukleme_Sablonu.csv', 'text/csv;charset=utf-8;');
    } else if (type === 'contracts') {
      const sample = [
        'contractNo;customerName;contractTitle;stage;renewalPeriod;renewalDate;isgKatipNo;assignedExpert;assignedDoctor;servicesSummary;startDate;endDate;paymentMethod;paymentTerms',
        '"SZL-2026-001";"Örnek Sanayi A.Ş.";"2026 Tam Kapsamlı İSG Hizmet Sözleşmesi";"Aktif";"Aylık";"2026-12-31";"KATIP-2026-88412";"Ahmet Yılmaz (A Sınıfı)";"Dr. Mehmet Kaya";"İSG Uzmanı (40 Saat x ₺450); İşyeri Hekimi (20 Saat x ₺600)";"2026-01-01";"2026-12-31";"Banka Havalesi / EFT";"Aylık Düzenli Fatura"',
        '"SZL-2026-002";"Örnek Lojistik Ltd.";"Yıllık İşyeri Hekimliği & Danışmanlık";"Aktif";"Yıllık";"2027-01-31";"KATIP-2026-99120";"Mustafa Demir (B Sınıfı)";"Dr. Ayşe Can";"İşyeri Hekimliği (15 Saat x ₺650)";"2026-02-01";"2027-01-31";"Kredi Kartı (Mail Order)";"30 Gün Vadeli"'
      ].join('\r\n');
      downloadBlob('\uFEFF' + sample, 'Ornek_Sozlesme_Yukleme_Sablonu.csv', 'text/csv;charset=utf-8;');
    } else if (type === 'offers') {
      const sample = [
        'offerNo;customerName;subject;status;owner;validUntilDate;servicesSummary',
        '"TKL-2026-001";"Örnek Sanayi A.Ş.";"2026 Tam Kapsamlı İSG Hizmet Teklifi";"Teklif Verildi";"Ayşe Yılmaz";"2026-02-28";"İSG Uzmanı Hizmeti (30 Saat x ₺450); İşyeri Hekimi Hizmeti (15 Saat x ₺600)"',
        '"TKL-2026-002";"Örnek Lojistik Ltd.";"Danışmanlık & Risk Değerlendirmesi Teklifi";"Onaylandı";"Mert Demir";"2026-03-15";"Risk Değerlendirmesi Raporu (1 Adet x ₺7500); Acil Durum Planı (1 Adet x ₺4500)"'
      ].join('\r\n');
      downloadBlob('\uFEFF' + sample, 'Ornek_Teklif_Yukleme_Sablonu.csv', 'text/csv;charset=utf-8;');
    } else {
      const sample = [
        'service_name;danger_class;min_emp;max_emp;price',
        '"İSG Uzmanı";"Çok Tehlikeli";1;49;200',
        '"İşyeri Hekimi";"Tehlikeli";1;49;160',
        '"DSP (Diğer Sağlık Personeli)";"Az Tehlikeli";1;99;80'
      ].join('\r\n');
      downloadBlob('\uFEFF' + sample, 'Ornek_Fiyat_Listesi_Sablonu.csv', 'text/csv;charset=utf-8;');
    }
  };

  // ==========================================
  // HELPER IMPORT & ANALYSIS FUNCTIONS
  // ==========================================

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportStatusNotice(null);
    setAnalysis(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      if (file.name.endsWith('.json')) {
        parseJSONImport(text);
      } else if (file.name.endsWith('.csv')) {
        parseCSVImport(text);
      } else {
        setImportStatusNotice({ message: 'Lütfen sadece .json veya .csv uzantılı dosya yükleyiniz.', type: 'error' });
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseJSONImport = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      let records: any[] = [];
      let mod: ExportModule = targetImportModule;

      if (parsed.export_type === 'full_system_backup' && parsed.data) {
        mod = 'all';
        records = [parsed.data];
      } else if (Array.isArray(parsed)) {
        records = parsed;
      } else if (parsed.data && Array.isArray(parsed.data)) {
        records = parsed.data;
        if (parsed.export_type) mod = parsed.export_type;
      } else {
        records = [parsed];
      }

      runDryRunAnalysis(mod, records);
    } catch (err) {
      setImportStatusNotice({ message: 'JSON dosyası okunamadı. Geçersiz sözdizimi / format hatası.', type: 'error' });
    }
  };

  const parseCSVImport = (text: string) => {
    try {
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setImportStatusNotice({ message: 'CSV dosyası boş veya başlık satırı içermiyor.', type: 'error' });
        return;
      }

      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());

      const records: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v) => v.replace(/^["']|["']$/g, '').trim());
        if (values.length === headers.length || values.length > 1) {
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            let val: any = values[idx];
            if (val !== undefined) {
              if (val === 'true') val = true;
              else if (val === 'false') val = false;
              else if (!isNaN(Number(val)) && val !== '') val = Number(val);
              rowObj[h] = val;
            }
          });
          records.push(rowObj);
        }
      }

      runDryRunAnalysis(targetImportModule, records);
    } catch (err) {
      setImportStatusNotice({ message: 'CSV dosyası ayrıştırılamadı.', type: 'error' });
    }
  };

  const runDryRunAnalysis = (modType: ExportModule, rawRecords: any[]) => {
    let newRecs: any[] = [];
    let conflictRecs: any[] = [];
    let invalidRecs: any[] = [];

    if (modType === 'customers') {
      rawRecords.forEach((r) => {
        if (!r.name) {
          invalidRecs.push(r);
        } else {
          const exists = customers.some((c) => c.name.trim().toLowerCase() === String(r.name).trim().toLowerCase() || (r.id && c.id === r.id));
          if (exists) conflictRecs.push(r);
          else newRecs.push(r);
        }
      });
    } else if (modType === 'offers') {
      rawRecords.forEach((r) => {
        if (!r.subject || !r.customerName) {
          invalidRecs.push(r);
        } else {
          const exists = offers.some((o) => (r.id && o.id === r.id) || (r.offerNo && o.offerNo === r.offerNo));
          if (exists) conflictRecs.push(r);
          else newRecs.push(r);
        }
      });
    } else if (modType === 'contracts') {
      rawRecords.forEach((r) => {
        const title = r.contractTitle || r.title;
        if (!title || !r.customerName) {
          invalidRecs.push(r);
        } else {
          const exists = contracts.some((c) => (r.id && c.id === r.id) || (r.contractNo && c.contractNo === r.contractNo));
          if (exists) conflictRecs.push(r);
          else newRecs.push(r);
        }
      });
    } else if (modType === 'all') {
      // Full backup object
      newRecs = rawRecords;
    }

    setAnalysis({
      moduleType: modType,
      totalCount: rawRecords.length,
      newRecords: newRecs,
      conflictingRecords: conflictRecs,
      invalidRecords: invalidRecs,
      rawParsedData: rawRecords
    });
  };

  // EXECUTE IMPORT (COMMIT TO STATE & LOCALSTORAGE)
  const handleExecuteImport = () => {
    if (!analysis) return;

    if (mergePolicy === 'reset') {
      setShowResetConfirmModal(true);
      return;
    }

    commitImportData();
  };

  const commitImportData = (isReset = false) => {
    if (!analysis) return;
    const { moduleType, rawParsedData } = analysis;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    if (moduleType === 'all' && rawParsedData.length > 0 && rawParsedData[0].customers) {
      // FULL SYSTEM RESTORE
      const backup = rawParsedData[0];
      if (backup.customers) {
        setCustomers(backup.customers);
        localStorage.setItem('crm_customers_v2', JSON.stringify(backup.customers));
      }
      if (backup.offers) {
        setOffers(backup.offers);
        localStorage.setItem('crm_offers_v3', JSON.stringify(backup.offers));
      }
      if (backup.contracts) {
        setContracts(backup.contracts);
        localStorage.setItem('crm_contracts_v3', JSON.stringify(backup.contracts));
      }
      if (backup.priceRules) {
        localStorage.setItem('crm_price_list_v2', JSON.stringify(backup.priceRules));
      }

      setImportStatusNotice({
        message: '🎉 Tam sistem yedeği başarıyla geri yüklendi! Müşteriler, teklifler, sözleşmeler ve fiyat listeleri güncellendi.',
        type: 'success'
      });
      setSelectedFile(null);
      setAnalysis(null);
      setShowResetConfirmModal(false);
      return;
    }

    if (moduleType === 'customers') {
      setCustomers((prev) => {
        let updatedList = isReset ? [] : [...prev];
        rawParsedData.forEach((rec) => {
          if (!rec.name) return;
          const idx = updatedList.findIndex(
            (c) => c.name.trim().toLowerCase() === String(rec.name).trim().toLowerCase() || (rec.id && c.id === rec.id)
          );

          if (idx >= 0) {
            if (mergePolicy === 'overwrite') {
              updatedList[idx] = { ...updatedList[idx], ...rec };
              updatedCount++;
            } else if (mergePolicy === 'duplicate') {
              const newObj = { ...rec, id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` };
              updatedList.push(newObj);
              addedCount++;
            } else {
              // skip
              skippedCount++;
            }
          } else {
            const newObj: CustomerRecord = {
              id: rec.id || `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: rec.name,
              status: rec.status || 'Aktif',
              stage: rec.stage || 'Kazanıldı',
              owner: rec.owner || 'Ayşe Yılmaz',
              city: rec.city || 'İstanbul',
              district: rec.district || 'Tuzla',
              hazardClass: rec.hazardClass || 'Tehlikeli',
              sector: rec.sector || 'Genel',
              employeeCount: Number(rec.employeeCount) || 10,
              contact: rec.contact || '',
              phone: rec.phone || '',
              email: rec.email || '',
              taxNo: rec.taxNo || '',
              taxOffice: rec.taxOffice || '',
              naceCode: rec.naceCode || '',
              address: rec.address || '',
              offers: rec.offers || [],
              contracts: rec.contracts || [],
              ...rec
            };
            updatedList.push(newObj);
            addedCount++;
          }
        });
        localStorage.setItem('crm_customers_v2', JSON.stringify(updatedList));
        return updatedList;
      });
    } else if (moduleType === 'offers') {
      setOffers((prev) => {
        let updatedList = isReset ? [] : [...prev];
        rawParsedData.forEach((rec) => {
          if (!rec.subject || !rec.customerName) return;
          const idx = updatedList.findIndex((o) => (rec.id && o.id === rec.id) || (rec.offerNo && o.offerNo === rec.offerNo));

          if (idx >= 0) {
            if (mergePolicy === 'overwrite') {
              updatedList[idx] = { ...updatedList[idx], ...rec };
              updatedCount++;
            } else if (mergePolicy === 'duplicate') {
              const newObj = { ...rec, id: `off-${Date.now()}`, offerNo: `TKL-2026-${Math.floor(100 + Math.random() * 900)}` };
              updatedList.push(newObj);
              addedCount++;
            } else {
              skippedCount++;
            }
          } else {
            const newObj: OfferRecord = {
              id: rec.id || `off-${Date.now()}`,
              offerNo: rec.offerNo || `TKL-2026-${Math.floor(100 + Math.random() * 900)}`,
              customerName: rec.customerName,
              subject: rec.subject,
              status: rec.status || 'Gönderildi',
              validUntilDate: rec.validUntilDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              owner: rec.owner || 'Ayşe Yılmaz',
              createdDate: rec.createdDate || new Date().toISOString().split('T')[0],
              currentRevisionNo: rec.currentRevisionNo || 0,
              revisions: rec.revisions || [
                {
                  revisionNo: 0,
                  revisionDate: new Date().toISOString().substring(0, 16),
                  preparedBy: rec.owner || 'Ayşe Yılmaz',
                  revisionNotes: 'İçeri aktarılan teklif',
                  services: rec.services || [],
                  subtotal: 1000,
                  discountTotal: 0,
                  taxAmount: 200,
                  grandTotal: 1200
                }
              ]
            };
            updatedList.push(newObj);
            addedCount++;
          }
        });
        localStorage.setItem('crm_offers_v3', JSON.stringify(updatedList));
        return updatedList;
      });
    } else if (moduleType === 'contracts') {
      setContracts((prev) => {
        let updatedList = isReset ? [] : [...prev];
        rawParsedData.forEach((rec) => {
          const title = rec.contractTitle || rec.title;
          if (!title || !rec.customerName) return;
          const idx = updatedList.findIndex((c) => (rec.id && c.id === rec.id) || (rec.contractNo && c.contractNo === rec.contractNo));

          if (idx >= 0) {
            if (mergePolicy === 'overwrite') {
              updatedList[idx] = { ...updatedList[idx], ...rec, contractTitle: title };
              updatedCount++;
            } else if (mergePolicy === 'duplicate') {
              const newObj = { ...rec, id: `cnt-${Date.now()}`, contractNo: `SZL-2026-${Math.floor(100 + Math.random() * 900)}`, contractTitle: title };
              updatedList.push(newObj);
              addedCount++;
            } else {
              skippedCount++;
            }
          } else {
            const newObj: ContractRecord = {
              id: rec.id || `cnt-${Date.now()}`,
              contractNo: rec.contractNo || `SZL-2026-${Math.floor(100 + Math.random() * 900)}`,
              customerName: rec.customerName,
              contractTitle: title,
              stage: rec.stage || rec.status || 'Aktif',
              isgKatipNo: rec.isgKatipNo || '',
              assignedExpert: rec.assignedExpert || '',
              assignedDoctor: rec.assignedDoctor || '',
              assignedDsp: rec.assignedDsp || '',
              startDate: rec.startDate || new Date().toISOString().split('T')[0],
              endDate: rec.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
              currentRevisionNo: rec.currentRevisionNo || 0,
              createdDate: rec.createdDate || new Date().toISOString().split('T')[0],
              owner: rec.owner || 'Ayşe Yılmaz',
              paymentMethod: rec.paymentMethod || 'Banka Havalesi / EFT',
              paymentTerms: rec.paymentTerms || 'Aylık Düzenli Fatura',
              billingCycle: rec.billingCycle || 'Aylık',
              autoRenew: rec.autoRenew !== undefined ? Boolean(rec.autoRenew) : true,
              notes: rec.notes || '',
              revisions: rec.revisions || [
                {
                  revisionNo: 0,
                  revisionDate: new Date().toISOString().substring(0, 10),
                  preparedBy: rec.owner || 'Sistem İçe Aktarım',
                  revisionNotes: 'İçeri aktarılan sözleşme',
                  contractTitle: title,
                  isgKatipNo: rec.isgKatipNo || '',
                  assignedExpert: rec.assignedExpert || '',
                  assignedDoctor: rec.assignedDoctor || '',
                  assignedDsp: rec.assignedDsp || '',
                  startDate: rec.startDate || new Date().toISOString().split('T')[0],
                  endDate: rec.endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
                  services: rec.services || [],
                  subtotal: 1000,
                  discountTotal: 0,
                  taxAmount: 200,
                  grandTotal: 1200
                }
              ]
            };
            updatedList.push(newObj);
            addedCount++;
          }
        });
        localStorage.setItem('crm_contracts_v3', JSON.stringify(updatedList));
        return updatedList;
      });
    }

    setImportStatusNotice({
      message: `✅ İçe aktarım başarıyla tamamlandı! ${addedCount} yeni kayıt eklendi, ${updatedCount} kayıt güncellendi, ${skippedCount} kayıt atlandı.`,
      type: 'success'
    });

    setSelectedFile(null);
    setAnalysis(null);
    setShowResetConfirmModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* HEADER SUMMARY CARD */}
      <article className="panel panel-wide panel-elevated" style={{ padding: '22px 28px', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <p className="eyebrow" style={{ color: 'var(--accent)', fontWeight: 700 }}>Veri Yönetimi & Entegrasyon</p>
            <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-main)', fontWeight: 800 }}>
              📥 İçeri & 📤 Dışarı Veri Aktarımı (Import / Export)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Sistemdeki tüm müşteri firmaları, teklifleri, sözleşmeleri ve fiyat listelerini JSON veya Excel (CSV) formatında yedekleyin veya içeri aktarın.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <span className="mini-badge" style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 700 }}>
              🏢 {customers.length} Müşteri
            </span>
            <span className="mini-badge" style={{ background: 'rgba(99, 102, 241, 0.14)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 700 }}>
              📑 {offers.length} Teklif
            </span>
            <span className="mini-badge" style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700 }}>
              📜 {contracts.length} Sözleşme
            </span>
          </div>
        </div>
      </article>

      {/* 2 MAIN PANELS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        {/* PANEL 1: EXPORT (DIŞARI AKTARIM) */}
        <article className="panel panel-elevated" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>
              📤 Dışarı Veri Aktarma (Export)
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Dilediğiniz modülü veya tüm sistemi topluca bilgisayarınıza indirin.
            </span>
          </div>

          {exportNotice && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#047857', fontSize: '0.84rem', fontWeight: 700 }}>
              {exportNotice}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="select-field">
              <span>Aktarılacak Modül Seçin:</span>
              <select
                value={selectedExportModule}
                onChange={(e) => setSelectedExportModule(e.target.value as ExportModule)}
                style={{ fontWeight: 700, padding: '8px 12px' }}
              >
                <option value="all">🌐 TÜM SİSTEM YEDEĞİ (Müşteriler + Teklifler + Sözleşmeler + Fiyat Listesi)</option>
                <option value="customers">🏢 Sadece Müşteri Firmalar ({customers.length} Kayıt)</option>
                <option value="offers">📑 Sadece Teklifler & Revizyonlar ({offers.length} Kayıt)</option>
                <option value="contracts">📜 Sadece Sözleşmeler ({contracts.length} Kayıt)</option>
                <option value="priceRules">🏷️ Sadece Fiyat Listesi & Matris Kuralları</option>
              </select>
            </label>

            <label className="select-field">
              <span>Dosya Formatı:</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className={selectedExportFormat === 'json' ? 'btn-action-primary' : 'btn-action-ghost'}
                  onClick={() => setSelectedExportFormat('json')}
                  style={{ fontSize: '0.84rem', padding: '8px 12px', textAlign: 'center', justifyContent: 'center' }}
                >
                  📄 JSON (Tam Yedek / Restorasyon)
                </button>
                <button
                  type="button"
                  className={selectedExportFormat === 'csv' ? 'btn-action-primary' : 'btn-action-ghost'}
                  onClick={() => setSelectedExportFormat('csv')}
                  style={{ fontSize: '0.84rem', padding: '8px 12px', textAlign: 'center', justifyContent: 'center' }}
                >
                  📊 CSV (Excel / Raporlama)
                </button>
              </div>
            </label>

            <div style={{ background: 'var(--surface-subtle)', padding: 12, borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              💡 <strong>İpucu:</strong> Tam sistem restorasyonu yapmak istiyorsanız <strong>JSON</strong> formatını tercih edin. Microsoft Excel veya Google Sheets ile analiz yapmak istiyorsanız <strong>CSV</strong> formatını indirin.
            </div>

            <button
              type="button"
              className="btn-action-primary"
              onClick={handleExportData}
              style={{ padding: '12px 20px', fontSize: '0.92rem', fontWeight: 800, background: '#0d9488', justifyContent: 'center', marginTop: 6 }}
            >
              📤 Verileri Şimdi İndir (.{(selectedExportFormat).toUpperCase()})
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '8px 0' }} />

          {/* SAMPLE TEMPLATES DOWNLOAD */}
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>
              📥 Örnek İçe Aktarım Şablonlarını İndirin (CSV Template)
            </span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-action-ghost"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                onClick={() => handleDownloadSampleCSV('customers')}
              >
                📄 Müşteri Şablonu (.csv)
              </button>
              <button
                type="button"
                className="btn-action-ghost"
                style={{ fontSize: '0.78rem', padding: '6px 12px', border: '1px solid #2563eb', color: '#2563eb' }}
                onClick={() => handleDownloadSampleCSV('offers')}
              >
                📑 Teklif Şablonu (.csv)
              </button>
              <button
                type="button"
                className="btn-action-ghost"
                style={{ fontSize: '0.78rem', padding: '6px 12px', border: '1px solid #d97706', color: '#d97706' }}
                onClick={() => handleDownloadSampleCSV('contracts')}
              >
                📜 Sözleşme Şablonu (.csv)
              </button>
              <button
                type="button"
                className="btn-action-ghost"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                onClick={() => handleDownloadSampleCSV('priceRules')}
              >
                📄 Fiyat Listesi Şablonu (.csv)
              </button>
            </div>
          </div>
        </article>

        {/* PANEL 2: IMPORT (İÇERİ AKTARIM - AUTOMATIC WIZARD) */}
        <article className="panel panel-elevated" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>
              📥 İçeri Veri Aktarma & Restorasyon (Import)
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Dosya seçtiğinizde veya sürükleyip bıraktığınızda 4 adımlı Türkçe alan eşleme sihirbazı otomatik başlayacaktır.
            </span>
          </div>

          {importStatusNotice && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: 700,
                background: importStatusNotice.type === 'success' ? 'rgba(16, 185, 129, 0.14)' : importStatusNotice.type === 'error' ? 'rgba(239, 68, 68, 0.14)' : 'rgba(59, 130, 246, 0.14)',
                color: importStatusNotice.type === 'success' ? '#047857' : importStatusNotice.type === 'error' ? '#dc2626' : '#1d4ed8',
                border: `1px solid ${importStatusNotice.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : importStatusNotice.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
              }}
            >
              {importStatusNotice.message}
            </div>
          )}

          {/* STEP 1: MODÜL SEÇİMİ VE FILE UPLOAD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="select-field">
              <span>Hedef Yükleme Modülü:</span>
              <select
                value={targetImportModule}
                onChange={(e) => setTargetImportModule(e.target.value as ExportModule)}
                style={{ fontWeight: 700 }}
              >
                <option value="customers">🏢 Müşteri Firmalar</option>
                <option value="offers">📑 Teklifler & Revizyonlar</option>
                <option value="contracts">📜 Sözleşmeler</option>
                <option value="all">🌐 Tam Sistem Yedeği (JSON Restore)</option>
              </select>
            </label>

            {/* DRAG & DROP ZONE */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const f = e.dataTransfer.files[0];
                  setSelectedFile(f);
                  setWizardFile(f);
                  setIsWizardOpen(true);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? '#0d9488' : 'var(--border)'}`,
                background: dragActive ? 'rgba(13, 148, 136, 0.06)' : 'var(--surface-subtle)',
                borderRadius: 14,
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.xlsx,.xls,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    setSelectedFile(f);
                    setWizardFile(f);
                    setIsWizardOpen(true);
                  }
                }}
              />
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>📂</span>
              <strong style={{ fontSize: '1rem', color: 'var(--text-main)', display: 'block' }}>
                {selectedFile ? selectedFile.name : 'Dosyanızı Buraya Sürükleyin veya Seçin'}
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                Desteklenen formatlar: .CSV veya .JSON (Maksimum 10MB)
              </span>
              <span style={{ display: 'inline-block', marginTop: 12, background: 'var(--accent-soft)', color: 'var(--text-main)', padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                ⚡ Dosya seçildiği anda 4 adımlı sihirbaz otomatik başlayacaktır
              </span>
            </div>

            {selectedFile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 16px', borderRadius: 12, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem' }}>📄</span>
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>{selectedFile.name}</strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{(selectedFile.size / 1024).toFixed(1)} KB ayrıştırıldı</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-action-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 14px', background: '#2563eb' }}
                    onClick={() => {
                      setWizardFile(selectedFile);
                      setIsWizardOpen(true);
                    }}
                  >
                    🚀 Sihirbazı Aç (Adım 2)
                  </button>
                  <button
                    type="button"
                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setWizardFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    🗑️ Seçilen Dosyayı Sil
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>
      </div>

      {/* FULL RESET CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20
          }}
        >
          <div
            style={{
              maxWidth: 520, width: '100%',
              background: 'var(--surface-strong)', border: '2px solid #ef4444',
              borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', padding: 28,
              display: 'flex', flexDirection: 'column', gap: 16
            }}
          >
            <h3 style={{ margin: 0, color: '#ef4444', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ UYARI: Tam Sistem Restorasyonu
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              Yüklediğiniz yedek dosyası mevcut sistemdeki tüm müşterileri, teklifleri ve sözleşmeleri sıfırlayarak yedekteki verilerle değiştirecektir.
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 10, color: '#dc2626', fontSize: '0.82rem', fontWeight: 700 }}>
              🔴 Bu işlem geri alınamaz! İlerlemeden önce mevcut verilerinizi dışarı aktardığınızdan emin olun.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button type="button" className="btn-action-ghost" onClick={() => setShowResetConfirmModal(false)}>İptal Et</button>
              <button
                type="button"
                className="btn-action-primary"
                style={{ background: '#ef4444', color: '#fff' }}
                onClick={() => commitImportData(true)}
              >
                Sistemi Sıfırla ve Yükle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMART DATA IMPORT WIZARD MODAL */}
      <DataImportWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setWizardFile(null);
        }}
        initialModule={targetImportModule === 'all' ? 'customers' : targetImportModule as any}
        initialFile={wizardFile}
        customers={customers}
        setCustomers={setCustomers}
        offers={offers}
        setOffers={setOffers}
        contracts={contracts}
        setContracts={setContracts}
      />
    </div>
  );
}
