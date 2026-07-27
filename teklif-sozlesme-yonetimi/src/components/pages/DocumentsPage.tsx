import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { documentSeeds } from '../../data/workbench';
import type { ContractRecord, DocumentCategory, DocumentRecord } from '../../types';
import type { CustomerRecord } from './CustomersPage';

interface DocumentsPageProps {
  customers?: CustomerRecord[];
  contracts?: ContractRecord[];
}

export function DocumentsPage({ customers = [], contracts = [] }: DocumentsPageProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => {
    try {
      const stored = localStorage.getItem('crm_documents_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading documents from localStorage', e);
    }
    return documentSeeds;
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_documents_v2', JSON.stringify(documents));
    } catch (e) {
      console.error('Error saving documents to localStorage', e);
    }
  }, [documents]);

  const [activeTab, setActiveTab] = useState<'archive' | 'bulk-import' | 'analytics'>('archive');

  // Archive filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Tümü');
  const [customerFilter, setCustomerFilter] = useState<string>('Tümü');
  const [statusFilter, setStatusFilter] = useState<string>('Tümü');

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [linkModalDoc, setLinkModalDoc] = useState<DocumentRecord | null>(null);
  const [linkCustomer, setLinkCustomer] = useState('');
  const [linkContractNo, setLinkContractNo] = useState('');
  const [linkCategory, setLinkCategory] = useState<DocumentCategory>('Sözleşme');

  // Bulk import state
  const [stagedFiles, setStagedFiles] = useState<DocumentRecord[]>([]);
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState('');

  // Customer options list
  const customerNamesList = useMemo(() => {
    const fromProps = customers.map((c) => c.name);
    const fromDocs = documents.map((d) => d.customerName).filter((n): n is string => Boolean(n));
    return Array.from(new Set([...fromProps, ...fromDocs])).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [customers, documents]);

  // Filtered documents for Archive
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        (doc.customerName && doc.customerName.toLowerCase().includes(q)) ||
        (doc.linkedContractNo && doc.linkedContractNo.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'Tümü' || doc.category === categoryFilter;
      const matchesCust = customerFilter === 'Tümü' || doc.customerName === customerFilter;
      const matchesStatus = statusFilter === 'Tümü' || doc.status === statusFilter;

      return matchesSearch && matchesCat && matchesCust && matchesStatus;
    });
  }, [documents, searchQuery, categoryFilter, customerFilter, statusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalCount = documents.length;
    const unassignedCount = documents.filter((d) => d.status === 'Eşleşmedi / Havuzda' || !d.customerName).length;
    const pendingSignatureCount = documents.filter((d) => d.status === 'İmza Bekliyor').length;
    const contractsCount = documents.filter((d) => d.category === 'Sözleşme' || d.category === 'Ek Protokol / Revizyon').length;

    return {
      totalCount,
      unassignedCount,
      pendingSignatureCount,
      contractsCount,
      totalStorageMB: (totalCount * 3.4).toFixed(1)
    };
  }, [documents]);

  // Auto-matching simulation parser
  const parseAndMatchFilename = (fileName: string): { customerName?: string; category: DocumentCategory; matchConfidence: number; linkedContractNo?: string } => {
    const lower = fileName.toLowerCase();
    let customerName: string | undefined = undefined;
    let matchConfidence = 0;
    let linkedContractNo: string | undefined = undefined;

    // Check customer names match
    if (lower.includes('alfa')) {
      customerName = 'Alfa OSGB Sanayi';
      matchConfidence += 50;
    } else if (lower.includes('beta')) {
      customerName = 'Beta Lojistik A.Ş.';
      matchConfidence += 50;
    } else if (lower.includes('delta')) {
      customerName = 'Delta Kimya Tesisleri A.Ş.';
      matchConfidence += 50;
    }

    // Check category match
    let category: DocumentCategory = 'Diğer';
    if (lower.includes('sozlesme') || lower.includes('szl') || lower.includes('contract')) {
      category = 'Sözleşme';
      matchConfidence += 40;
    } else if (lower.includes('protokol') || lower.includes('ek_')) {
      category = 'Ek Protokol / Revizyon';
      matchConfidence += 40;
    } else if (lower.includes('teklif') || lower.includes('tkl')) {
      category = 'Teklif Dokümanı';
      matchConfidence += 40;
    } else if (lower.includes('pkd') || lower.includes('rapor') || lower.includes('analiz')) {
      category = 'Saha & Risk Analiz Raporu';
      matchConfidence += 40;
    } else if (lower.includes('tarama') || lower.includes('saglik') || lower.includes('muayene')) {
      category = 'Sağlık Muayene Formu';
      matchConfidence += 40;
    }

    // Contract No regex check (e.g. SZL-2026-001 or KTP-882910)
    const contractMatch = fileName.match(/(SZL-\d{4}-\d{3}|KTP-\d+)/i);
    if (contractMatch) {
      linkedContractNo = contractMatch[0].toUpperCase();
      matchConfidence += 10;
    }

    return { customerName, category, matchConfidence: Math.min(matchConfidence, 100), linkedContractNo };
  };

  // Trigger Bulk Batch Import Simulation
  const handleSimulateBatchUpload = (fileCount: number) => {
    setIsSimulatingUpload(true);
    setTimeout(() => {
      const sampleFiles = [
        'Alfa_OSGB_Sanayi_SZL-2026-001_Hizmet_Sozlesmesi.pdf',
        'Beta_Lojistik_2026_Ek_Protokol_Rev1.pdf',
        'Delta_Kimya_PKD_Patlamadan_Korunma_Raporu.pdf',
        'SCAN_2026_Geçmiş_Sözleşme_Arşivi_001.pdf',
        'Alfa_OSGB_Gezici_Mobil_Saglık_Muayene_Formlari.pdf',
        'KTP-99210_Isyeri_Hekimi_Atama_Sertifikasi.pdf',
        'Isimsiz_Gelen_Evrak_Tarama_2026.pdf',
        'Beta_Lojistik_Ilk_Yardim_Egitim_Katilim_Listesi.pdf',
        'Delta_Kimya_2026_Yillik_Teklif_Dokumani.pdf',
        'Alfa_OSGB_Yangin_Tatbikat_Protokolu.pdf'
      ];

      const newStaged: DocumentRecord[] = [];
      const countToGen = Math.min(fileCount, 25);

      for (let i = 0; i < countToGen; i++) {
        const rawName = sampleFiles[i % sampleFiles.length];
        const fileName = i > 9 ? `Batch_PDF_${i + 1}_${rawName}` : rawName;
        const parsed = parseAndMatchFilename(fileName);

        newStaged.push({
          id: `stg-${Date.now()}-${i}`,
          title: fileName.replace(/_/g, ' ').replace('.pdf', ''),
          fileName,
          fileSize: `${(Math.random() * 4 + 1).toFixed(1)} MB`,
          fileType: 'PDF',
          category: parsed.category,
          customerName: parsed.customerName || '',
          linkedContractNo: parsed.linkedContractNo || '',
          uploadDate: new Date().toISOString().split('T')[0],
          uploadedBy: 'Toplu Aktarım Botu',
          status: parsed.matchConfidence >= 80 ? 'Onaylandı / Bağlandı' : 'Eşleşmedi / Havuzda',
          matchConfidence: parsed.matchConfidence,
          notes: parsed.matchConfidence >= 80 ? 'Dosya adından otomatik eşleştirildi' : 'Havuzda eşleştirme bekliyor'
        });
      }

      setStagedFiles(newStaged);
      setIsSimulatingUpload(false);
    }, 800);
  };

  // Commit Staged Files to main Documents Store
  const handleCommitStagedFiles = () => {
    if (stagedFiles.length === 0) return;
    setDocuments((prev) => [...stagedFiles, ...prev]);
    setUploadSuccessNotice(`✅ ${stagedFiles.length} adet doküman kurumsal arşive başarıyla aktarıldı ve ilişkilendirildi!`);
    setStagedFiles([]);
    setTimeout(() => setUploadSuccessNotice(''), 4000);
    setActiveTab('archive');
  };

  // Delete Document
  const handleDeleteDoc = (docId: string) => {
    if (window.confirm('Bu dokümanı arşivden silmek istediğinize emin misiniz?')) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  // Save Link Modal Changes
  const handleSaveLinkModal = () => {
    if (!linkModalDoc) return;
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== linkModalDoc.id) return d;
        return {
          ...d,
          customerName: linkCustomer || d.customerName,
          linkedContractNo: linkContractNo || d.linkedContractNo,
          category: linkCategory,
          status: linkCustomer ? 'Onaylandı / Bağlandı' : d.status,
          matchConfidence: linkCustomer ? 100 : d.matchConfidence
        };
      })
    );
    setLinkModalDoc(null);
  };

  return (
    <section className="panel panel-wide panel-elevated page-layout" style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* PAGE HEADER */}
      <div className="section-heading" style={{ marginBottom: 16 }}>
        <div>
          <p className="eyebrow">Kurumsal Dijital Arşiv & Evrak Yönetim Merkezi</p>
          <h3 style={{ margin: 0, fontSize: '1.4rem' }}>📁 Dokümanlar ve Toplu İçe Aktarım</h3>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="mini-badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
            ⚡ Akıllı PDF OCR & Eşleme
          </span>
          <button
            type="button"
            className="btn-action-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setActiveTab('bulk-import')}
          >
            📥 + Toplu PDF Evrak Yükle
          </button>
        </div>
      </div>

      {/* SUCCESS NOTICE */}
      {uploadSuccessNotice && (
        <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontWeight: 700, fontSize: '0.9rem' }}>
          {uploadSuccessNotice}
        </div>
      )}

      {/* SUMMARY STATS BAR */}
      <div className="customer-summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        <article className="summary-card" style={{ padding: 14, borderLeft: '4px solid #6366f1' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Toplam Arşiv Dokümanı</span>
          <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{stats.totalCount} Adet</strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats.totalStorageMB} MB Bulut Depolama</p>
        </article>

        <article className="summary-card" style={{ padding: 14, borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Eşleşmemiş Evrak Havuzu</span>
          <strong style={{ fontSize: '1.5rem', color: stats.unassignedCount > 0 ? '#f59e0b' : 'var(--text-main)' }}>
            {stats.unassignedCount} Doküman
          </strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Müşteri bağlantısı bekliyor</p>
        </article>

        <article className="summary-card" style={{ padding: 14, borderLeft: '4px solid #ec4899' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>İmza Bekleyen Evraklar</span>
          <strong style={{ fontSize: '1.5rem', color: stats.pendingSignatureCount > 0 ? '#ec4899' : 'var(--text-main)' }}>
            {stats.pendingSignatureCount} Adet
          </strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Islak/Dijital onay takibinde</p>
        </article>

        <article className="summary-card" style={{ padding: 14, borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sözleşme & Protokoller</span>
          <strong style={{ fontSize: '1.5rem', color: '#10b981' }}>{stats.contractsCount} Dosya</strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resmi hukuki arşiv belgeleri</p>
        </article>
      </div>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid var(--border)', marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('archive')}
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'archive' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'archive' ? '3px solid var(--accent)' : '3px solid transparent'
          }}
        >
          📂 1. Kurumsal Evrak Arşivi ({filteredDocuments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bulk-import')}
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'bulk-import' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'bulk-import' ? '3px solid var(--accent)' : '3px solid transparent'
          }}
        >
          ⚡ 2. Toplu PDF Yükleme & Akıllı Eşleştirme Motoru {stagedFiles.length > 0 && `(${stagedFiles.length} Taslak)`}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 700,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'analytics' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === 'analytics' ? '3px solid var(--accent)' : '3px solid transparent'
          }}
        >
          📊 3. Depolama & Evrak Analitiği
        </button>
      </div>

      {/* TAB 1: KURUMSAL EVRAK ARŞİVİ */}
      {activeTab === 'archive' && (
        <div>
          {/* SEARCH & FILTERS BAR */}
          <div style={{ background: 'var(--surface-subtle)', padding: 14, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>🔍 Doküman veya Firma Ara</label>
              <input
                type="text"
                placeholder="Örn: Sözleşme, Alfa OSGB, SZL-2026..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>📂 Doküman Kategorisi</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
              >
                <option value="Tümü">Tüm Kategoriler</option>
                <option value="Sözleşme">Sözleşmeler</option>
                <option value="Ek Protokol / Revizyon">Ek Protokol / Revizyonlar</option>
                <option value="Teklif Dokümanı">Teklif Dokümanları</option>
                <option value="Saha & Risk Analiz Raporu">Saha & Risk Analiz Raporları</option>
                <option value="Sağlık Muayene Formu">Sağlık Muayene Formları</option>
                <option value="Sertifika / Eğitim">Sertifika & Eğitim</option>
                <option value="Diğer">Diğer Evraklar</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>🏢 Bağlı Müşteri</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
              >
                <option value="Tümü">Tüm Müşteriler</option>
                {customerNamesList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>📌 Evrak Durumu</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.88rem' }}
              >
                <option value="Tümü">Tüm Durumlar</option>
                <option value="Onaylandı / Bağlandı">🟢 Onaylandı / Bağlandı</option>
                <option value="Eşleşmedi / Havuzda">🟡 Eşleşmedi / Havuzda</option>
                <option value="İmza Bekliyor">⏳ İmza Bekliyor</option>
                <option value="Arşiv">📁 Arşiv</option>
              </select>
            </div>
          </div>

          {/* TABLE OF DOCUMENTS */}
          <div className="panel panel-elevated" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Doküman & Dosya Adı</th>
                  <th style={{ padding: '12px 16px' }}>Kategori</th>
                  <th style={{ padding: '12px 16px' }}>Bağlı Müşteri & Sözleşme</th>
                  <th style={{ padding: '12px 16px' }}>Yükleyen & Tarih</th>
                  <th style={{ padding: '12px 16px' }}>Durum</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Aranan kriterlere uygun doküman bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: 800, fontSize: '0.78rem' }}>
                            {doc.fileType}
                          </span>
                          <div>
                            <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.92rem' }}>{doc.title}</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {doc.fileName} • {doc.fileSize}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700, background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                          {doc.category}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {doc.customerName ? (
                          <div>
                            <strong style={{ color: 'var(--accent)', display: 'block' }}>🏢 {doc.customerName}</strong>
                            {doc.linkedContractNo && (
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>📑 {doc.linkedContractNo}</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>⚠️ Bağlantı Bekliyor (Havuzda)</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.82rem' }}>
                          <span>{doc.uploadedBy}</span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.uploadDate}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {doc.status === 'Onaylandı / Bağlandı' && (
                          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                            🟢 Onaylandı
                          </span>
                        )}
                        {doc.status === 'Eşleşmedi / Havuzda' && (
                          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                            🟡 Havuzda
                          </span>
                        )}
                        {doc.status === 'İmza Bekliyor' && (
                          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
                            ⏳ İmza Bekliyor
                          </span>
                        )}
                        {doc.status === 'Arşiv' && (
                          <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(100, 116, 139, 0.12)', color: '#64748b' }}>
                            📁 Arşiv
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn-action-ghost"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                            onClick={() => setPreviewDoc(doc)}
                          >
                            👁️ İncele
                          </button>

                          <button
                            type="button"
                            className="btn-action-ghost"
                            style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#6366f1' }}
                            onClick={() => {
                              setLinkModalDoc(doc);
                              setLinkCustomer(doc.customerName || '');
                              setLinkContractNo(doc.linkedContractNo || '');
                              setLinkCategory(doc.category);
                            }}
                          >
                            🔗 Düzenle / Bağla
                          </button>

                          <button
                            type="button"
                            className="btn-action-ghost"
                            style={{ padding: '5px 8px', fontSize: '0.78rem', color: '#ef4444' }}
                            onClick={() => handleDeleteDoc(doc.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TOPLU PDF YÜKLEME & AKILLI EŞLEŞTİRME MOTORU */}
      {activeTab === 'bulk-import' && (
        <div>
          {/* UPLOAD DROPZONE BOX */}
          <div
            style={{
              border: '2px dashed var(--accent)',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              background: 'rgba(99, 102, 241, 0.04)',
              marginBottom: 20
            }}
          >
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: 10 }}>📥</span>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              Toplu Geçmiş PDF Evrakları ve ZIP Arşivini Sürükleyip Bırakın
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 650, marginInline: 'auto' }}>
              Binlerce geçmiş PDF sözleşme, teklif ve saha dokümanını aynı anda sisteme yükleyebilirsiniz. Sistem dosya isimlerindeki müşteri adı, vergi numarası ve sözleşme kodlarını otomatik analiz eder.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-action-primary"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                onClick={() => handleSimulateBatchUpload(10)}
                disabled={isSimulatingUpload}
              >
                {isSimulatingUpload ? '⚙️ PDF Dosyaları Analiz Ediliyor...' : '⚡ Örnek 10 Adet Geçmiş PDF Dokümanı Yükle'}
              </button>

              <button
                type="button"
                className="btn-action-ghost"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                onClick={() => handleSimulateBatchUpload(25)}
                disabled={isSimulatingUpload}
              >
                📦 ZIP Dosyası Yükle ve Tara (25 PDF)
              </button>
            </div>
          </div>

          {/* STAGING TABLE (BATH REVIEW & AUTO MATCHING) */}
          {stagedFiles.length > 0 && (
            <div className="panel panel-elevated" style={{ padding: 16, background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    📋 Yüklenen Toplu Evrak Havuzu ({stagedFiles.length} Dosya)
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Otomatik eşleşenleri kontrol edin ve tek tıkla kurumsal arşive aktarın.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn-action-ghost"
                    style={{ color: '#ef4444' }}
                    onClick={() => setStagedFiles([])}
                  >
                    ✕ Taslağı Temizle
                  </button>

                  <button
                    type="button"
                    className="btn-action-primary"
                    style={{ padding: '8px 20px', fontSize: '0.9rem', background: '#10b981' }}
                    onClick={handleCommitStagedFiles}
                  >
                    💾 Tüm {stagedFiles.length} Evrakı Kurumsal Arşive Aktar
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-subtle)', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px' }}>Dosya Adı</th>
                      <th style={{ padding: '10px 12px' }}>Otomatik Eşleşme Skoru</th>
                      <th style={{ padding: '10px 12px' }}>Tespit Edilen Müşteri</th>
                      <th style={{ padding: '10px 12px' }}>Belge Kategori Seçimi</th>
                      <th style={{ padding: '10px 12px' }}>Sözleşme No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedFiles.map((stg, idx) => (
                      <tr key={stg.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          📄 {stg.fileName} <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>({stg.fileSize})</span>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          {(stg.matchConfidence || 0) >= 80 ? (
                            <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                              🟢 %{stg.matchConfidence} Otomatik Eşleşti
                            </span>
                          ) : (stg.matchConfidence || 0) > 0 ? (
                            <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                              🟡 %{stg.matchConfidence} Kısmi Eşleşme
                            </span>
                          ) : (
                            <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                              🔴 %0 Eşleşmedi (Manuel Seçin)
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={stg.customerName || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStagedFiles((prev) => {
                                const updated = [...prev];
                                updated[idx].customerName = val;
                                updated[idx].matchConfidence = val ? 100 : 0;
                                updated[idx].status = val ? 'Onaylandı / Bağlandı' : 'Eşleşmedi / Havuzda';
                                return updated;
                              });
                            }}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.82rem', width: '100%' }}
                          >
                            <option value="">-- Müşteri Seçilmedi --</option>
                            {customerNamesList.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={stg.category}
                            onChange={(e) => {
                              const val = e.target.value as DocumentCategory;
                              setStagedFiles((prev) => {
                                const updated = [...prev];
                                updated[idx].category = val;
                                return updated;
                              });
                            }}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.82rem', width: '100%' }}
                          >
                            <option value="Sözleşme">Sözleşme</option>
                            <option value="Ek Protokol / Revizyon">Ek Protokol / Revizyon</option>
                            <option value="Teklif Dokümanı">Teklif Dokümanı</option>
                            <option value="Saha & Risk Analiz Raporu">Saha & Risk Analiz Raporu</option>
                            <option value="Sağlık Muayene Formu">Sağlık Muayene Formu</option>
                            <option value="Sertifika / Eğitim">Sertifika / Eğitim</option>
                            <option value="Diğer">Diğer</option>
                          </select>
                        </td>

                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="text"
                            placeholder="Örn: SZL-2026-001"
                            value={stg.linkedContractNo || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStagedFiles((prev) => {
                                const updated = [...prev];
                                updated[idx].linkedContractNo = val;
                                return updated;
                              });
                            }}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)', fontSize: '0.82rem', width: 120 }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEPOLAMA & EVRAK ANALİTİĞİ */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          <article className="panel panel-elevated" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-main)' }}>📊 Doküman Kategori Dağılımı</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Sözleşmeler', cat: 'Sözleşme', color: '#6366f1' },
                { label: 'Ek Protokol & Revizyonlar', cat: 'Ek Protokol / Revizyon', color: '#10b981' },
                { label: 'Teklif Dokümanları', cat: 'Teklif Dokümanı', color: '#3b82f6' },
                { label: 'Saha Raporları & PKD', cat: 'Saha & Risk Analiz Raporu', color: '#f59e0b' },
                { label: 'Sağlık Muayene Formları', cat: 'Sağlık Muayene Formu', color: '#ec4899' }
              ].map((item) => {
                const count = documents.filter((d) => d.category === item.cat).length;
                const pct = documents.length > 0 ? Math.round((count / documents.length) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                      <span>{item.label}</span>
                      <strong>{count} Dosya (%{pct})</strong>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-subtle)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="panel panel-elevated" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-main)' }}>🛡️ Güvenlik & Bulut Arşiv Sağlığı</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.86rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: 12, borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <strong style={{ color: '#047857', display: 'block' }}>🟢 Otomatik Günlük YEDEKLEME Aktif</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#065f46' }}>Tüm PDF dokümanları 256-bit AES şifreleme ile saklanmaktadır.</p>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: 12, borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <strong style={{ color: '#4338ca', display: 'block' }}>⚖️ Hukuki Geçerlilik & Zaman Damgası</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#3730a3' }}>Yüklenen ıslak imzalı taramalar zaman damgasıyla imzalanır.</p>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* MODAL 1: DOCUMENT PREVIEW */}
      {previewDoc && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div className="modal-content" style={{ background: 'var(--surface-strong)', color: 'var(--text-main)', padding: 24, borderRadius: 16, width: '90%', maxWidth: 700, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>📄 Doküman İnceleme & Detay</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{previewDoc.fileName}</span>
              </div>
              <button type="button" className="btn-action-ghost" onClick={() => setPreviewDoc(null)}>✕ Kapat</button>
            </div>

            <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.88rem' }}>
              <div><strong>Başlık: </strong> {previewDoc.title}</div>
              <div><strong>Kategori: </strong> {previewDoc.category}</div>
              <div><strong>Bağlı Müşteri: </strong> {previewDoc.customerName || 'Bağlantı Yok (Havuzda)'}</div>
              <div><strong>Sözleşme No: </strong> {previewDoc.linkedContractNo || 'Yok'}</div>
              <div><strong>Yükleme Tarihi & Personel: </strong> {previewDoc.uploadDate} - {previewDoc.uploadedBy}</div>
              <div><strong>Notlar: </strong> {previewDoc.notes || 'Not eklenmemiş.'}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn-action-primary" onClick={() => alert('PDF Dokümanı indiriliyor...')}>
                ⬇️ PDF İndir ({previewDoc.fileSize})
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: LINK & EDIT DOCUMENT */}
      {linkModalDoc && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div className="modal-content" style={{ background: 'var(--surface-strong)', color: 'var(--text-main)', padding: 24, borderRadius: 16, width: '90%', maxWidth: 550, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>🔗 Dokümanı Müşteri / Sözleşmeye Bağla</h3>
              <button type="button" className="btn-action-ghost" onClick={() => setLinkModalDoc(null)}>✕ Kapat</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Müşteri Seçin *</label>
                <select
                  value={linkCustomer}
                  onChange={(e) => setLinkCustomer(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                >
                  <option value="">-- Müşteri Seçilmedi --</option>
                  {customerNamesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Doküman Kategorisi</label>
                <select
                  value={linkCategory}
                  onChange={(e) => setLinkCategory(e.target.value as DocumentCategory)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                >
                  <option value="Sözleşme">Sözleşme</option>
                  <option value="Ek Protokol / Revizyon">Ek Protokol / Revizyon</option>
                  <option value="Teklif Dokümanı">Teklif Dokümanı</option>
                  <option value="Saha & Risk Analiz Raporu">Saha & Risk Analiz Raporu</option>
                  <option value="Sağlık Muayene Formu">Sağlık Muayene Formu</option>
                  <option value="Sertifika / Eğitim">Sertifika / Eğitim</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 4 }}>Bağlı Sözleşme / Form No</label>
                <input
                  type="text"
                  placeholder="Örn: SZL-2026-001 veya KTP-882910"
                  value={linkContractNo}
                  onChange={(e) => setLinkContractNo(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn-action-ghost" onClick={() => setLinkModalDoc(null)}>İptal</button>
              <button type="button" className="btn-action-primary" onClick={handleSaveLinkModal}>💾 Bağlantıyı Kaydet</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
