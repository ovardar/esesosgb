import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CustomerRecord, CustomerContact } from '../pages/CustomersPage';
import type { ContractRecord, OfferRecord } from '../../types';
import type { PriceRule } from '../pages/PriceListsPage';

export type ImportModuleType = 'customers' | 'contracts' | 'offers' | 'priceRules';
export type MergePolicyType = 'overwrite' | 'skip' | 'duplicate';

type FieldDefinition = {
  key: string;
  label: string;
  required?: boolean;
  synonyms: string[];
  defaultValue?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialModule?: ImportModuleType;
  initialFile?: File | null;
  customers: CustomerRecord[];
  setCustomers: React.Dispatch<React.SetStateAction<CustomerRecord[]>>;
  offers: OfferRecord[];
  setOffers: React.Dispatch<React.SetStateAction<OfferRecord[]>>;
  contracts: ContractRecord[];
  setContracts: React.Dispatch<React.SetStateAction<ContractRecord[]>>;
};

// FIELD DEFINITIONS FOR EACH MODULE IN USER-FRIENDLY TURKISH
const FIELD_DEFINITIONS: Record<ImportModuleType, FieldDefinition[]> = {
  customers: [
    { key: 'name', label: 'Firma Ünvanı / Müşteri Adı', required: true, synonyms: ['name', 'firma adı', 'müşteri adı', 'şirket adı', 'firma unvanı', 'ünvan', 'unvan', 'company name', 'müşteri', 'firma', 'cari unvan', 'cari adı'] },
    { key: 'status', label: 'Müşteri Durumu (Aktif / Aday)', synonyms: ['status', 'durum', 'müşteri durumu', 'state'] },
    { key: 'stage', label: 'Satış / İletişim Aşaması', synonyms: ['stage', 'aşama', 'satış aşaması', 'faz', 'adımları'] },
    { key: 'owner', label: 'Sorumlu Müşteri Temsilcisi', synonyms: ['owner', 'sorumlu kişi', 'müşteri temsilcisi', 'sorumlu', 'temsilci', 'danışman', 'atanan kişi'] },
    { key: 'city', label: 'Şehir / İl', synonyms: ['city', 'şehir', 'il', 'vilayet'] },
    { key: 'district', label: 'İlçe / Semt', synonyms: ['district', 'ilçe', 'semt', 'bölge'] },
    { key: 'hazardClass', label: 'Tehlike Sınıfı (Az Tehlikeli / Tehlikeli / Çok Tehlikeli)', synonyms: ['hazardclass', 'tehlike sınıfı', 'tehlike', 'tehlike derecesi'] },
    { key: 'sector', label: 'Sektör / Çalışma Alanı', synonyms: ['sector', 'sektör', 'iş kolu', 'faaliyet alanı'] },
    { key: 'employeeCount', label: 'Çalışan / Personel Sayısı', synonyms: ['employeecount', 'çalışan sayısı', 'personel sayısı', 'işçi sayısı', 'çalışan', 'personel'] },
    { key: 'contact', label: 'İletişim Kişisi / Yetkili Adı', synonyms: ['contact', 'yetkili kişi', 'kontak', 'yetkili', 'ilgili kişi', 'irtibat'] },
    { key: 'phone', label: 'Telefon Numarası', synonyms: ['phone', 'telefon', 'tel', 'cep', 'gsm', 'irtibat tel'] },
    { key: 'email', label: 'E-posta Adresi', synonyms: ['email', 'eposta', 'e-posta', 'mail', 'email adresi'] },
    { key: 'taxNo', label: 'Vergi Kimlik No (VKN / TCKN)', synonyms: ['taxno', 'vergi no', 'vkn', 'tckn', 'vergi numarası', 'tc no'] },
    { key: 'taxOffice', label: 'Vergi Dairesi', synonyms: ['taxoffice', 'vergi dairesi', 'v.d.', 'vd'] },
    { key: 'naceCode', label: 'NACE Kodu', synonyms: ['nacecode', 'nace kodu', 'nace', 'faaliyet kodu'] },
    { key: 'address', label: 'Açık Adres', synonyms: ['address', 'adres', 'açık adres', 'lokasyon', 'işyeri adresi'] },
    { key: 'website', label: 'Web Sitesi', synonyms: ['website', 'web sitesi', 'web', 'url', 'site'] },
    { key: 'leadSource', label: 'Müşteri Kazanım Kaynağı', synonyms: ['leadsource', 'kaynak', 'geldiğin kanal', 'referans', 'kanal'] }
  ],
  contracts: [
    { key: 'customerName', label: 'Hizmet Alan Müşteri Firma *', required: true, synonyms: ['customername', 'müşteri adı', 'firma adı', 'hizmet alan', 'müşteri', 'firma'] },
    { key: 'contractTitle', label: 'Sözleşme Takip Adı / Konusu *', required: true, synonyms: ['contracttitle', 'title', 'sözleşme adı', 'konu', 'sözleşme başlığı', 'takip adı'] },
    { key: 'contractNo', label: 'Sözleşme Numarası', synonyms: ['contractno', 'sözleşme no', 'sözleşme numarası', 'evrak no'] },
    { key: 'stage', label: 'Sözleşme Durumu (Aktif / Yenilenecek)', synonyms: ['stage', 'durum', 'sözleşme durumu', 'status'] },
    { key: 'renewalPeriod', label: 'Yenileme Dönemi (Aylık / Yıllık / 6 Aylık)', synonyms: ['renewalperiod', 'yenileme dönemi', 'periyot', 'dönem', 'yenileme periyodu'] },
    { key: 'renewalDate', label: 'Yenileme / Hatırlatma Tarihi', synonyms: ['renewaldate', 'yenileme tarihi', 'hatırlatma tarihi', 'bildirim tarihi'] },
    { key: 'isgKatipNo', label: 'İSG-KÂTİP Belge No', synonyms: ['isgkatipno', 'katip no', 'isg katip no', 'katip numarası'] },
    { key: 'assignedExpert', label: 'Atanan İSG Uzmanı', synonyms: ['assignedexpert', 'uzman', 'isg uzmanı', 'atanan uzman'] },
    { key: 'assignedDoctor', label: 'Atanan İşyeri Hekimi', synonyms: ['assigneddoctor', 'hekim', 'işyeri hekimi', 'atanan hekim'] },
    { key: 'servicesSummary', label: 'Hizmet Kalemleri & Fiyatları (Ayrılmış / Çoklu)', synonyms: ['servicessummary', 'hizmet kalemleri', 'kalemler', 'hizmetler', 'hizmet ve fiyatlar'] },
    { key: 'startDate', label: 'Başlangıç Tarihi', synonyms: ['startdate', 'başlangıç', 'başlangıç tarihi', 'imza tarihi'] },
    { key: 'endDate', label: 'Bitiş Tarihi', synonyms: ['enddate', 'bitiş', 'bitiş tarihi', 'geçerlilik bitiş'] },
    { key: 'paymentMethod', label: 'Ödeme Yöntemi', synonyms: ['paymentmethod', 'ödeme yöntemi', 'ödeme tipi', 'ödeme kanalı'] },
    { key: 'paymentTerms', label: 'Ödeme Şekli / Vadesi', synonyms: ['paymentterms', 'ödeme şekli', 'vade', 'ödeme şartları'] }
  ],
  offers: [
    { key: 'customerName', label: 'Müşteri Firma Ünvanı *', required: true, synonyms: ['customername', 'müşteri adı', 'firma adı', 'müşteri', 'firma'] },
    { key: 'subject', label: 'Teklif Konusu / Başlık *', required: true, synonyms: ['subject', 'teklif konusu', 'konu', 'başlık', 'teklif başlığı'] },
    { key: 'offerNo', label: 'Teklif Numarası', synonyms: ['offerno', 'teklif no', 'teklif numarası', 'form no'] },
    { key: 'status', label: 'Teklif Durumu', synonyms: ['status', 'durum', 'teklif durumu'] },
    { key: 'owner', label: 'Hazırlayan Temsilci', synonyms: ['owner', 'hazırlayan', 'temsilci', 'sorumlu'] },
    { key: 'validUntilDate', label: 'Son Geçerlilik Tarihi', synonyms: ['validuntildate', 'geçerlilik tarihi', 'son geçerlilik', 'vade'] },
    { key: 'servicesSummary', label: 'Hizmet Kalemleri & Fiyatları (Ayrılmış / Çoklu)', synonyms: ['servicessummary', 'hizmet kalemleri', 'kalemler', 'hizmetler', 'hizmet ve fiyatlar'] }
  ],
  priceRules: [
    { key: 'service_name', label: 'Hizmet / Kalem Tanımı *', required: true, synonyms: ['service_name', 'hizmet adı', 'kalem adı', 'hizmet tanımı', 'hizmet', 'kalem'] },
    { key: 'danger_class', label: 'Tehlike Sınıfı *', required: true, synonyms: ['danger_class', 'tehlike sınıfı', 'tehlike', 'derece'] },
    { key: 'price', label: 'Birim Fiyat (₺) *', required: true, synonyms: ['price', 'birim fiyat', 'fiyat', 'tutar', 'ücret'] },
    { key: 'min_emp', label: 'Min Çalışan', synonyms: ['min_emp', 'min çalışan', 'en az çalışan', 'min personel'] },
    { key: 'max_emp', label: 'Max Çalışan', synonyms: ['max_emp', 'max çalışan', 'en çok çalışan', 'max personel'] }
  ]
};

// AUTO-MATCHING ALGORITHM (HEADER SIMILARITY)
function autoMatchHeader(fieldDef: FieldDefinition, headers: string[]): string {
  const normKey = fieldDef.key.toLowerCase();
  const normLabel = fieldDef.label.toLowerCase();

  for (const h of headers) {
    const normH = h.trim().toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');

    // Check exact or synonym matches
    if (normH === normKey.replace(/[^a-z0-9ğüşıöç]/g, '')) return h;

    for (const syn of fieldDef.synonyms) {
      const normSyn = syn.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '');
      if (normH === normSyn || normH.includes(normSyn) || normSyn.includes(normH)) {
        return h;
      }
    }
  }

  return '';
}

// HELPER: PARSE MULTIPLE CONTACTS (SEMICOLON / PIPE / COMMA SEPARATED)
function parseMultipleContacts(contactStr: string, phoneStr: string, emailStr: string): CustomerContact[] {
  const rawContacts = (contactStr || '').split(/;|\||\n/).map((s) => s.trim()).filter(Boolean);
  const rawPhones = (phoneStr || '').split(/;|\||\n/).map((s) => s.trim()).filter(Boolean);
  const rawEmails = (emailStr || '').split(/;|\||\n/).map((s) => s.trim()).filter(Boolean);

  const len = Math.max(rawContacts.length, rawPhones.length, rawEmails.length, 1);
  const contacts: CustomerContact[] = [];

  for (let i = 0; i < len; i++) {
    const rawName = rawContacts[i] || rawContacts[0] || (i === 0 ? 'Genel İletişim' : `İletişim Kişisi ${i + 1}`);
    const titleMatch = rawName.match(/^(.*?)(?:\((.*?)\))?$/);
    const name = titleMatch ? titleMatch[1].trim() : rawName;
    const title = titleMatch && titleMatch[2] ? titleMatch[2].trim() : (i === 0 ? 'Ana Yetkili' : 'Temsilci');

    contacts.push({
      id: `ct-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
      name: name || 'Yetkili Kişi',
      title: title,
      email: rawEmails[i] || rawEmails[0] || '',
      phone: rawPhones[i] || rawPhones[0] || '',
      extension: '',
      isPrimary: i === 0,
      roles: i === 0 ? ['Karar Verici'] : ['Operasyonel İrtibat'],
      notes: 'İçe aktarıldı'
    });
  }

  return contacts;
}

// HELPER: PARSE SERVICES SUMMARY (LINE ITEMS & PRICES)
function parseServicesSummary(summaryStr: string): Array<{ serviceName: string; quantity: number; unitPrice: number; kdvPercent: number }> {
  if (!summaryStr || typeof summaryStr !== 'string') {
    return [
      { serviceName: 'İSG Uzmanı Hizmeti', quantity: 30, unitPrice: 450, kdvPercent: 20 },
      { serviceName: 'İşyeri Hekimi Hizmeti', quantity: 15, unitPrice: 600, kdvPercent: 20 }
    ];
  }

  const items = summaryStr.split(/;|\||\n/).map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) {
    return [
      { serviceName: 'İSG Uzmanı Hizmeti', quantity: 30, unitPrice: 450, kdvPercent: 20 }
    ];
  }

  return items.map((item) => {
    const match = item.match(/^(.*?)(?:\(?(\d+)\s*(?:Saat|Ay|Adet|Kişi)?\s*(?:x|\*|×)?\s*₺?(\d+(?:[.,]\d+)?)\)?)?$/i);
    if (match) {
      const name = match[1].replace(/[-:]$/, '').trim() || item;
      const qty = match[2] ? parseInt(match[2], 10) : 1;
      const price = match[3] ? parseFloat(match[3].replace(',', '.')) : 500;
      return { serviceName: name, quantity: qty, unitPrice: price, kdvPercent: 20 };
    }
    return { serviceName: item, quantity: 1, unitPrice: 500, kdvPercent: 20 };
  });
}

export function DataImportWizardModal({
  isOpen,
  onClose,
  initialModule = 'customers',
  initialFile,
  customers,
  setCustomers,
  offers,
  setOffers,
  contracts,
  setContracts
}: Props) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeModule, setActiveModule] = useState<ImportModuleType>(initialModule);

  // STEP 1 STATE
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  // STEP 2 STATE (FIELD MAPPING & DEFAULTS)
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [defaultOwner, setDefaultOwner] = useState<string>('Ayşe Yılmaz');
  const [defaultCity, setDefaultCity] = useState<string>('İstanbul');

  // STEP 3 STATE (DUPLICATE AUDIT)
  const [mergePolicy, setMergePolicy] = useState<MergePolicyType>('overwrite');

  // STEP 4 STATE (RESULTS)
  const [importResult, setImportResult] = useState<{
    addedCount: number;
    updatedCount: number;
    skippedCount: number;
    totalCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedFileRef = useRef<File | null>(null);

  // PARSE FILE (CSV / JSON)
  const handleFileChange = React.useCallback((file: File) => {
    setSelectedFile(file);
    setCurrentStep(2);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        parseJSON(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }, [activeModule]);

  React.useEffect(() => {
    if (isOpen) {
      if (initialModule) {
        setActiveModule(initialModule);
      }
      if (initialFile && processedFileRef.current !== initialFile) {
        processedFileRef.current = initialFile;
        setCurrentStep(2);
        handleFileChange(initialFile);
      }
    } else {
      processedFileRef.current = null;
      setCurrentStep(1);
    }
  }, [isOpen, initialFile, initialModule, handleFileChange]);

  if (!isOpen) return null;

  const currentFieldDefs = FIELD_DEFINITIONS[activeModule];

  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return;

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map((v) => v.replace(/^["']|["']$/g, '').trim());
      if (values.length > 0) {
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] !== undefined ? values[idx] : '';
        });
        rows.push(rowObj);
      }
    }

    setParsedHeaders(headers);
    setParsedRows(rows);

    // Perform auto-matching for Step 2
    const initialMap: Record<string, string> = {};
    FIELD_DEFINITIONS[activeModule].forEach((field) => {
      const matchedHeader = autoMatchHeader(field, headers);
      if (matchedHeader) {
        initialMap[field.key] = matchedHeader;
      }
    });
    setFieldMapping(initialMap);
    setCurrentStep(2);
  };

  const parseJSON = (text: string) => {
    try {
      const data = JSON.parse(text);
      let records: any[] = Array.isArray(data) ? data : data.data && Array.isArray(data.data) ? data.data : [data];
      if (records.length === 0) return;

      const headers = Object.keys(records[0] || {});
      setParsedHeaders(headers);
      setParsedRows(records);

      const initialMap: Record<string, string> = {};
      FIELD_DEFINITIONS[activeModule].forEach((field) => {
        const matchedHeader = autoMatchHeader(field, headers);
        if (matchedHeader) {
          initialMap[field.key] = matchedHeader;
        }
      });
      setFieldMapping(initialMap);
    } catch (e) {
      console.error(e);
    }
  };

  // EXECUTE IMPORT (COMMIT TO STATE AND LOCALSTORAGE)
  const executeImport = () => {
    let added = 0;
    let updated = 0;
    let skipped = 0;

    if (activeModule === 'customers') {
      const existingList = [...customers];
      parsedRows.forEach((row) => {
        const nameVal = row[fieldMapping['name']] || row['name'] || row['Firma Ünvanı'];
        if (!nameVal) {
          skipped++;
          return;
        }

        const normName = String(nameVal).trim().toLowerCase();
        const existingIdx = existingList.findIndex((c) => c.name.trim().toLowerCase() === normName);

        const contactStr = row[fieldMapping['contact']] || '';
        const phoneStr = row[fieldMapping['phone']] || '';
        const emailStr = row[fieldMapping['email']] || '';
        const parsedContacts = parseMultipleContacts(contactStr, phoneStr, emailStr);

        const mappedRecord: any = {
          name: String(nameVal).trim(),
          status: row[fieldMapping['status']] || 'Aktif',
          stage: row[fieldMapping['stage']] || 'Kazanıldı',
          owner: row[fieldMapping['owner']] || defaultOwner,
          city: row[fieldMapping['city']] || defaultCity,
          district: row[fieldMapping['district']] || 'Tuzla',
          hazardClass: row[fieldMapping['hazardClass']] || 'Tehlikeli',
          sector: row[fieldMapping['sector']] || 'Genel',
          employeeCount: Number(row[fieldMapping['employeeCount']]) || 10,
          contact: contactStr || (parsedContacts[0]?.name ?? ''),
          phone: phoneStr || (parsedContacts[0]?.phone ?? ''),
          email: emailStr || (parsedContacts[0]?.email ?? ''),
          contactsList: parsedContacts,
          taxNo: row[fieldMapping['taxNo']] || '',
          taxOffice: row[fieldMapping['taxOffice']] || '',
          naceCode: row[fieldMapping['naceCode']] || '',
          address: row[fieldMapping['address']] || '',
          website: row[fieldMapping['website']] || '',
          leadSource: row[fieldMapping['leadSource']] || 'Dosya İçe Aktarımı'
        };

        if (existingIdx >= 0) {
          if (mergePolicy === 'overwrite') {
            existingList[existingIdx] = { ...existingList[existingIdx], ...mappedRecord };
            updated++;
          } else if (mergePolicy === 'duplicate') {
            const newObj = { ...mappedRecord, id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, offers: [], contracts: [] };
            existingList.push(newObj);
            added++;
          } else {
            skipped++;
          }
        } else {
          const newObj = { ...mappedRecord, id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, offers: [], contracts: [] };
          existingList.push(newObj);
          added++;
        }
      });

      setCustomers(existingList);
      localStorage.setItem('crm_customers_v2', JSON.stringify(existingList));
    } else if (activeModule === 'contracts') {
      const existingList = [...contracts];
      parsedRows.forEach((row) => {
        const custName = row[fieldMapping['customerName']] || row['customerName'];
        const title = row[fieldMapping['contractTitle']] || row['contractTitle'] || 'İSG Hizmet Sözleşmesi';

        if (!custName) {
          skipped++;
          return;
        }

        const servicesSummary = row[fieldMapping['servicesSummary']] || '';
        const parsedServices = parseServicesSummary(servicesSummary);

        const existingIdx = existingList.findIndex((c) => c.customerName.trim().toLowerCase() === String(custName).trim().toLowerCase() && c.contractTitle === title);

        const mappedRecord: any = {
          customerName: String(custName).trim(),
          contractTitle: String(title).trim(),
          contractNo: row[fieldMapping['contractNo']] || `SZL-2026-${Math.floor(100 + Math.random() * 900)}`,
          stage: row[fieldMapping['stage']] || 'Aktif',
          renewalPeriod: row[fieldMapping['renewalPeriod']] || 'Aylık',
          renewalDate: row[fieldMapping['renewalDate']] || row[fieldMapping['endDate']] || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          isgKatipNo: row[fieldMapping['isgKatipNo']] || '',
          assignedExpert: row[fieldMapping['assignedExpert']] || '',
          assignedDoctor: row[fieldMapping['assignedDoctor']] || '',
          startDate: row[fieldMapping['startDate']] || new Date().toISOString().split('T')[0],
          endDate: row[fieldMapping['endDate']] || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          paymentMethod: row[fieldMapping['paymentMethod']] || 'Banka Havalesi / EFT',
          paymentTerms: row[fieldMapping['paymentTerms']] || 'Aylık Düzenli Fatura',
          services: parsedServices
        };

        if (existingIdx >= 0) {
          if (mergePolicy === 'overwrite') {
            existingList[existingIdx] = { ...existingList[existingIdx], ...mappedRecord };
            updated++;
          } else if (mergePolicy === 'duplicate') {
            const newObj = { ...mappedRecord, id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, revisions: [] };
            existingList.push(newObj);
            added++;
          } else {
            skipped++;
          }
        } else {
          const newObj = { ...mappedRecord, id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, revisions: [] };
          existingList.push(newObj);
          added++;
        }
      });

      setContracts(existingList);
      localStorage.setItem('crm_contracts_v3', JSON.stringify(existingList));
    } else if (activeModule === 'offers') {
      const existingList = [...offers];
      parsedRows.forEach((row) => {
        const custName = row[fieldMapping['customerName']] || row['customerName'];
        const subject = row[fieldMapping['subject']] || row['subject'] || 'İSG Hizmet Teklifi';

        if (!custName) {
          skipped++;
          return;
        }

        const servicesSummary = row[fieldMapping['servicesSummary']] || '';
        const parsedServices = parseServicesSummary(servicesSummary);

        const mappedRecord: any = {
          id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          customerName: String(custName).trim(),
          subject: String(subject).trim(),
          offerNo: row[fieldMapping['offerNo']] || `TKL-2026-${Math.floor(100 + Math.random() * 900)}`,
          status: row[fieldMapping['status']] || 'Teklif Verildi',
          owner: row[fieldMapping['owner']] || defaultOwner,
          validUntilDate: row[fieldMapping['validUntilDate']] || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          date: new Date().toISOString().split('T')[0],
          services: parsedServices,
          discountAmount: 0,
          notes: 'Excel dosyasından aktarıldı'
        };

        existingList.push(mappedRecord);
        added++;
      });

      setOffers(existingList);
      localStorage.setItem('crm_offers_v3', JSON.stringify(existingList));
    }

    setImportResult({
      addedCount: added,
      updatedCount: updated,
      skippedCount: skipped,
      totalCount: parsedRows.length
    });

    setCurrentStep(4);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          color: '#1e293b',
          borderRadius: 20,
          maxWidth: 900,
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER TITLE */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
              {activeModule === 'customers' ? 'Şirketleri / Müşterileri İçe Aktar' : activeModule === 'contracts' ? 'Sözleşmeleri İçe Aktar' : 'Verileri İçe Aktar'}
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Esnek Türkçe Alan Eşleme & Akıllı Veri Aktarma Sihirbazı</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>

        {/* STEPPER NAV BAR */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: '12px 28px', gap: 20, fontSize: '0.84rem', fontWeight: 700 }}>
          <div style={{ color: currentStep === 1 ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: currentStep === 1 ? '#2563eb' : '#cbd5e1', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.74rem' }}>1</span>
            <span>Kaynak dosya ve ayarlar</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>›</span>
          <div style={{ color: currentStep === 2 ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: currentStep === 2 ? '#2563eb' : '#cbd5e1', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.74rem' }}>2</span>
            <span>Alan eşleme</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>›</span>
          <div style={{ color: currentStep === 3 ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: currentStep === 3 ? '#2563eb' : '#cbd5e1', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.74rem' }}>3</span>
            <span>Mükerrer kopya denetimi</span>
          </div>
          <span style={{ color: '#cbd5e1' }}>›</span>
          <div style={{ color: currentStep === 4 ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: currentStep === 4 ? '#10b981' : '#cbd5e1', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.74rem' }}>4</span>
            <span>Sonuç</span>
          </div>
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* STEP 1: FILE SELECTION */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  İçe Aktarılacak Veri Modülü:
                </label>
                <select
                  value={activeModule}
                  onChange={(e) => setActiveModule(e.target.value as ImportModuleType)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="customers">🏢 Müşteriler / Şirketler Listesi</option>
                  <option value="contracts">📜 Sözleşmeler Listesi</option>
                  <option value="offers">📑 Teklifler Listesi</option>
                  <option value="priceRules">🏷️ Fiyat Listesi & Matris Kuralları</option>
                </select>
              </div>

              {/* DRAG & DROP FILE ZONE */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive || selectedFile ? '#2563eb' : '#cbd5e1'}`,
                  background: dragActive || selectedFile ? 'rgba(37, 99, 235, 0.04)' : '#f8fafc',
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
                  accept=".csv,.xlsx,.xls,.json,.txt"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📁</div>
                <strong style={{ fontSize: '1.05rem', color: '#0f172a', display: 'block' }}>
                  {selectedFile ? `Yüklenen Dosya: ${selectedFile.name}` : 'Excel / CSV / JSON dosyanızı buraya sürükleyin'}
                </strong>
                <span style={{ fontSize: '0.84rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                  veya bilgisayarınızdan dosya seçmek için tıklayın (.csv, .xlsx, .json)
                </span>

                {parsedRows.length > 0 && (
                  <div style={{ marginTop: 14, display: 'inline-flex', gap: 10, background: '#e0f2fe', color: '#0369a1', padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 800 }}>
                    ✓ Toplam {parsedRows.length} kayıt ve {parsedHeaders.length} sütun başlığı başarıyla ayrıştırıldı.
                  </div>
                )}
              </div>

              {/* DEMO QUICK SAMPLE DATA BUTTON */}
              <div style={{ background: '#f0fdf4', border: '1px dashed #16a34a', padding: '12px 16px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.86rem', color: '#15803d', display: 'block' }}>💡 Test İçi Örnek Veri Yükleyici</strong>
                  <span style={{ fontSize: '0.78rem', color: '#166534' }}>Excel dosyanız yanınızda değilse, örnek veri setiyle alan eşleme ekranını hemen deneyin.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sampleCSV = `Firma Unvanı;Müşteri Durumu;Satış Aşaması;Sorumlu Kişi;Şehir;İlçe;Tehlike Derecesi;Personel Sayısı;Yetkili Kişi;Telefon;E-Posta;Vergi Numarası;Vergi Dairesi;NACE Kodu;Adres
"Alfa Sanayi A.Ş.";"Aktif";"Kazanıldı";"Ayşe Yılmaz";"İstanbul";"Tuzla";"Çok Tehlikeli";150;"Mehmet Demir";"05321002030";"info@alfasanayi.com";"1234567890";"Tuzla V.D.";"25.11.01";"Tuzla Sanayi No:12"
"Beta Lojistik Ltd.";"Aday";"Teklif Verildi";"Ayşe Yılmaz";"Kocaeli";"Gebze";"Tehlikeli";45;"Ali Kaya";"05422003040";"ali@betalojistik.com";"9876543210";"Gebze V.D.";"52.29.01";"Gebze OSB No:5"`;
                    setSelectedFile(new File([sampleCSV], "Ornek_Musteri_Listesi.csv", { type: "text/csv" }));
                    parseCSV(sampleCSV);
                  }}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  ⚡ Örnek Veri Yükle & Eşlemeyi Dene
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: FIELD MAPPING (EXACT MOCKUP UI) */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ALAN EŞLEME LISTESI */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', color: '#0f172a', fontWeight: 800 }}>
                  Alan eşleme
                </h4>
                <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Sol taraftaki sistem alanları ile sağ taraftaki dosyanızın sütun başlıklarını eşleştirin. Otomatik algılanan alanlar seçilmiştir.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {currentFieldDefs.map((field) => {
                    const selectedHeader = fieldMapping[field.key] || '';
                    const isMatched = Boolean(selectedHeader);

                    return (
                      <div
                        key={field.key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '240px 1fr',
                          gap: 16,
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: isMatched ? '#ffffff' : '#f8fafc',
                          border: isMatched ? '1px solid #cbd5e1' : '1px dashed #cbd5e1'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#1e293b', display: 'block' }}>
                            {field.label}
                          </strong>
                          {field.required && (
                            <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>* Zorunlu Alan</span>
                          )}
                        </div>

                        <div style={{ position: 'relative' }}>
                          <select
                            value={selectedHeader}
                            onChange={(e) => setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: 8,
                              border: `1.5px solid ${isMatched ? '#2563eb' : '#cbd5e1'}`,
                              background: isMatched ? '#f0f9ff' : '#ffffff',
                              color: isMatched ? '#0369a1' : '#64748b',
                              fontSize: '0.88rem',
                              fontWeight: isMatched ? 700 : 400
                            }}
                          >
                            <option value="">+ Seç (Dosyadaki sütun başlığı)</option>
                            {parsedHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>

                          {isMatched && (
                            <span style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)', fontSize: '0.74rem', color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 10, fontWeight: 700, pointerEvents: 'none' }}>
                              ✓ Eşleşti
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DUPLICATE COPY AUDIT */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 800 }}>
                Mükerrer kopya denetimi ve kayıt politikası
              </h4>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                Yüklenen veriler arasında sistemde zaten var olan aynı Müşteri Adı veya Vergi No ile eşleşen bir kayıt bulunursa nasıl bir işlem yapılsın?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <label style={{ border: `2px solid ${mergePolicy === 'overwrite' ? '#2563eb' : '#e2e8f0'}`, background: mergePolicy === 'overwrite' ? '#eff6ff' : '#fff', padding: 16, borderRadius: 12, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <input
                    type="radio"
                    name="mergePolicy"
                    value="overwrite"
                    checked={mergePolicy === 'overwrite'}
                    onChange={() => setMergePolicy('overwrite')}
                    style={{ marginTop: 3, width: 18, height: 18 }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>🔄 Mevcut Kayıtların Üzerine Yaz (Güncelle)</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Eşleşen müşteri bulunursa dosyadaki yeni telefon, adres veya vergi numarası ile mevcut veriyi günceller.</span>
                  </div>
                </label>

                <label style={{ border: `2px solid ${mergePolicy === 'skip' ? '#2563eb' : '#e2e8f0'}`, background: mergePolicy === 'skip' ? '#eff6ff' : '#fff', padding: 16, borderRadius: 12, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <input
                    type="radio"
                    name="mergePolicy"
                    value="skip"
                    checked={mergePolicy === 'skip'}
                    onChange={() => setMergePolicy('skip')}
                    style={{ marginTop: 3, width: 18, height: 18 }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>⏭️ Mükerrer Kayıtları Atla (Pas Geç)</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sistemde kayıtlı olan müşterileri hiç ellemez, sadece yeni olan firmaları ekler.</span>
                  </div>
                </label>

                <label style={{ border: `2px solid ${mergePolicy === 'duplicate' ? '#2563eb' : '#e2e8f0'}`, background: mergePolicy === 'duplicate' ? '#eff6ff' : '#fff', padding: 16, borderRadius: 12, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <input
                    type="radio"
                    name="mergePolicy"
                    value="duplicate"
                    checked={mergePolicy === 'duplicate'}
                    onChange={() => setMergePolicy('duplicate')}
                    style={{ marginTop: 3, width: 18, height: 18 }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>📋 Çift Kayıt Olarak Ekle (Ayrı ID İle Ekle)</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Aynı isimde olsa bile her satır için yeni bağımsız bir müşteri kartı oluşturur.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORT RESULTS */}
          {currentStep === 4 && importResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3.5rem' }}>🎉</div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#166534', fontWeight: 900 }}>
                Veri İçe Aktarma Başarıyla Tamamlandı!
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                Seçmiş olduğunuz dosyadaki veriler Türkçe alan eşlemenize ve mükerrer kopya politikanıza göre aktarıldı.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 600, margin: '0 auto', width: '100%' }}>
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12, padding: 16 }}>
                  <strong style={{ fontSize: '1.6rem', color: '#15803d', display: 'block' }}>{importResult.addedCount}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>Yeni Kayıt Eklendi</span>
                </div>

                <div style={{ background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: 12, padding: 16 }}>
                  <strong style={{ fontSize: '1.6rem', color: '#0369a1', display: 'block' }}>{importResult.updatedCount}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#075985', fontWeight: 700 }}>Kayıt Güncellendi</span>
                </div>

                <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: 12, padding: 16 }}>
                  <strong style={{ fontSize: '1.6rem', color: '#b45309', display: 'block' }}>{importResult.skippedCount}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 700 }}>Atlanan Kayıt</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS BAR */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            {currentStep > 1 && currentStep < 4 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}
              >
                Geri
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {currentStep < 3 && (
              <button
                type="button"
                disabled={!selectedFile || parsedRows.length === 0}
                onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: !selectedFile || parsedRows.length === 0 ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: !selectedFile || parsedRows.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Sonraki ›
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={executeImport}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                🚀 Verileri İçe Aktarımı Başlat
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#0f172a', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Tamamla & Kapat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
