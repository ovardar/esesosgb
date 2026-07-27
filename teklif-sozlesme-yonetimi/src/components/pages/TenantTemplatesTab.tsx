import { useState, useEffect, useMemo, useRef } from 'react';
import type { SaaSTenant } from '../../types';

type Props = {
  impersonatedTenant?: SaaSTenant | null;
};

export type TenantTemplatesStore = {
  employeeInvite: {
    subject: string;
    body: string;
  };
  offerEmail: {
    subject: string;
    body: string;
  };
  offerPdf: {
    headerTitle: string;
    introNote: string;
    osgbDocDetails: string;
    termsAndConditions: string;
    footerText: string;
    showSignatureBlock: boolean;
  };
  contractEmail: {
    subject: string;
    body: string;
  };
  contractPdf: {
    contractTitle: string;
    osgbDocDetails: string;
    contractFullText: string;
    footerText: string;
    showSignatureBlock: boolean;
  };
};

const defaultTemplates: TenantTemplatesStore = {
  employeeInvite: {
    subject: 'İSG Portal Hesabı Aktivasyonu ve Şifre Belirleme',
    body: `Sayın {PERSONEL_ADI},

Firmamızın Offer & Contract İSG yönetim platformunda kullanıcı hesabınız tanımlanmıştır.

Aktivasyonunuzu tamamlamak ve kendi güvenli şifrenizi oluşturmak için lütfen aşağıdaki bağlantıya tıklayınız:
{AKTIVASYON_LINKI}

İyi çalışmalar dileriz.
{FIRMA_ADI} Yönetimi`
  },
  offerEmail: {
    subject: '{FIRMA_ADI} - İş Sağlığı ve Güvenliği Hizmet Teklifi ({TEKLIF_NO})',
    body: `Sayın {MUSTERI_YETKILISI},

{MUSTERI_ADI} firması için hazırladığımız İş Sağlığı ve Güvenliği Hizmet ve Fiyatlandırma Teklifimiz ektedir.

Teklif Özeti:
- Teklif Numarası: {TEKLIF_NO}
- Toplam Tutar: {TOPLAM_TUTAR} TL ({KDV_DURUMU})
- Geçerlilik Tarihi: {GECERLILIK_TARIHI}

Teklif dokümanınızı dijital ortamda incelemek, onaylamak veya revizyon bildirmek için tıklayınız:
{ONLINE_TEKLIF_LINKI}

Saygılarımızla,
{FIRMA_ADI} Satış & CRM Departmanı`
  },
  offerPdf: {
    headerTitle: 'KURUMSAL İŞ SAĞLIĞI VE GÜVENLİĞİ HİZMET TEKLİFİ',
    introNote: 'Sayın Yetkili, 6331 sayılı İş Sağlığı ve Güvenliği Kanunu uyarınca firmanızın ihtiyaç duyduğu profesyonel İSG hizmet kalemleri, görevlendirilecek uzman/hekim kadrosu ve birim fiyatlandırma matrisi aşağıda bilgilerinize sunulmuştur.',
    osgbDocDetails: 'İSG-KÂTİP Kurum Yetki Belge No: 4859/İSG • Ticaret Sicil No: 495821 • Büyük Mükellefler V.D. 6190492810',
    termsAndConditions: `1. İşbu teklif hazırlık tarihinden itibaren 30 (otuz) takvim günü süreyle geçerlidir.
2. Belirtilen birim fiyatlara KDV (%20) dahil değildir.
3. Tehlike sınıfı veya çalışan sayısındaki %10'u aşan değişikliklerde birim fiyatlar yeniden düzenlenir.
4. İSG-KÂTİP onayları sözleşme imzalanmasını takiben 3 (üç) iş günü içerisinde tamamlanacaktır.
5. Fatura ödemeleri hizmet ifasını takip eden ayın ilk 5 iş günü içerisinde banka hesabımıza ödenir.`,
    footerText: 'Kurumsal İSG & Danışmanlık Hizmetleri • Tel: 0850 000 00 00 • E-posta: teklif@codentra.com.tr • Web: www.codentra.com.tr',
    showSignatureBlock: true
  },
  contractEmail: {
    subject: '{FIRMA_ADI} - İSG Hizmet Sözleşmesi Metni ({SOZLESME_NO})',
    body: `Sayın {MUSTERI_YETKILISI},

{MUSTERI_ADI} ile şirketimiz arasında yürürlüğe girecek İş Sağlığı ve Güvenliği Hizmet Sözleşmesi metni hazırlanmıştır.

Sözleşme Özeti:
- Sözleşme No: {SOZLESME_NO}
- Hizmet Dönemi: {BASTAR_TARIHI} - {BITIS_TARIHI}
- Aylık Düzenli Hizmet Tutarı: {AYLIK_TUTAR} TL

Sözleşmeyi dijital ortamda incelemek için tıklayınız:
{ONLINE_SOZLESME_LINKI}

Saygılarımızla,
{FIRMA_ADI} Hukuk & Lisans Birimi`
  },
  contractPdf: {
    contractTitle: 'İŞ SAĞLIĞI VE GÜVENLİĞİ HİZMET ÇERÇEVE SÖZLEŞMESİ',
    osgbDocDetails: 'İSG-KÂTİP Kurum Yetki Belge No: 4859/İSG • Ticaret Sicil No: 495821 • Büyük Mükellefler V.D. 6190492810',
    contractFullText: `<b>MADDE 1 - TARAFLAR:</b> İşbu sözleşme bir tarafta <b>{FIRMA_ADI}</b> (HİZMET VEREN OSGB) ile diğer tarafta <b>{MUSTERI_ADI}</b> (HİZMET ALAN İŞVEREN) arasında 6331 sayılı İSG Kanunu uyarınca akdedilmiştir.

<b>MADDE 2 - KONU VE KAPSAM:</b> İşverenin işyerlerinde 6331 sayılı Kanun ve ilgili yönetmelikler kapsamında İş Güvenliği Uzmanı, İşyeri Hekimi ve Diğer Sağlık Personeli görevlendirilmesi hizmetidir.

<b>MADDE 3 - TARAFLARIN YÜKÜMLÜLÜKLERİ:</b> Hizmet Veren, mevzuata uygun uzman kadro atamalarını İSG-KÂTİP üzerinden yapmakla; Hizmet Alan ise onay süreçlerini zamanında tamamlamakla yükümlüdür.

<b>MADDE 4 - ENFLASYON VE FİYAT ARTIŞ ESASLARI:</b> Yıllık sözleşme yenileme dönemlerinde, TÜİK tarafından açıklanan <u>(TÜFE + Yİ-ÜFE) / 2</u> ortalaması oranında fiyat artışı otomatik olarak uygulanır.

<b>MADDE 5 - SÖZLEŞME SÜRESİ VE FESİH KOŞULLARI:</b> İşbu sözleşme <u>1 (bir) yıl süreyle</u> geçerli olup, taraflar sürenin bitiminden en az 30 gün önce yazılı bildirimde bulunmadığı takdirde aynı şartlarla 1 yıl uzar.

<b>MADDE 6 - GİZLİLİK VE KVKK:</b> Taraflar, hizmet ifası sırasında edindikleri tüm ticari ve kişisel verileri 6698 sayılı KVKK mevzuatına uygun olarak gizli tutacağını kabul eder.`,
    footerText: 'Kurumsal İSG Hukuk & Danışmanlık Hizmetleri • Tel: 0850 000 00 00 • E-posta: hukuk@codentra.com.tr',

    showSignatureBlock: true
  }
};

export type TemplatePageId = 'invite-email' | 'offer-email' | 'offer-pdf' | 'contract-email' | 'contract-pdf';

export function TenantTemplatesTab({ impersonatedTenant }: Props) {
  const [activePage, setActivePage] = useState<TemplatePageId>('invite-email');
  const [templates, setTemplates] = useState<TenantTemplatesStore>(() => {
    try {
      const saved = localStorage.getItem('crm_tenant_templates_v5');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return defaultTemplates;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const contractTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('crm_tenant_templates_v5', JSON.stringify(templates));
    } catch (e) {
      console.error(e);
    }
  }, [templates]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('crm_tenant_templates_v5', JSON.stringify(templates));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const companyDisplayName = impersonatedTenant ? impersonatedTenant.companyName : 'Metropol OSGB & Sağlık Hizmetleri A.Ş.';
  const companyLogoUrl = impersonatedTenant?.logoUrl;

  // Rich Text Formatting Insertion Helper for Contract Textarea
  const insertFormatting = (tagOpen: string, tagClose: string = '') => {
    const textarea = contractTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = templates.contractPdf.contractFullText;
    const selectedText = currentVal.substring(start, end);

    const replacement = tagOpen + (selectedText || '') + tagClose;
    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    setTemplates({
      ...templates,
      contractPdf: {
        ...templates.contractPdf,
        contractFullText: newVal
      }
    });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, end + tagOpen.length);
    }, 0);
  };

  // Helper to render formatted HTML securely in Contract PDF preview
  const renderFormattedContractHtml = (rawText: string) => {
    if (!rawText) return null;

    let processed = rawText
      .replace(/\{FIRMA_ADI\}/g, companyDisplayName)
      .replace(/\{MUSTERI_ADI\}/g, 'Alfa Lojistik A.Ş.')
      .replace(/\{SOZLESME_NO\}/g, 'SZL-2026-042')
      .replace(/\{BASTAR_TARIHI\}/g, '01.08.2026')
      .replace(/\{BITIS_TARIHI\}/g, '01.08.2027')
      .replace(/\{AYLIK_TUTAR\}/g, '₺40.512')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>');

    return (
      <div
        style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.78rem', color: '#334155' }}
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  // Sample placeholder service line items for the template preview
  const previewSampleServices = useMemo(
    () => [
      { id: '1', name: 'İş Güvenliği Uzmanlığı Hizmeti (A Sınıfı)', unit: 'Kişi / Ay', quantity: 128, unitPrice: 125, lineTotal: 16000 },
      { id: '2', name: 'İşyeri Hekimliği Sağlık Hizmeti', unit: 'Kişi / Ay', quantity: 128, unitPrice: 95, lineTotal: 12160 },
      { id: '3', name: 'Diğer Sağlık Personeli (DSP) Hizmeti', unit: 'Saat / Ay', quantity: 16, unitPrice: 350, lineTotal: 5600 }
    ],
    []
  );

  const previewSubtotal = 33760;
  const previewVat = 6752;
  const previewGrandTotal = 40512;

  return (
    <section className="panel panel-wide panel-elevated" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">Firma Yönetimi • Kurumsal Şablon Kütüphanesi</p>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{companyDisplayName} Şablon Yönetimi</h3>
        </div>
        {savedSuccess && (
          <span style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 800, fontSize: '0.84rem' }}>
            ✓ Şablon Değişiklikleri Başarıyla Kaydedildi
          </span>
        )}
      </div>

      {/* 5 SEPARATE DEDICATED TEMPLATE PAGES SELECTOR IN EXACT REQUESTED SEQUENCE */}
      <div className="filter-group" style={{ justifyContent: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          className={`filter-chip ${activePage === 'invite-email' ? 'filter-chip-active' : ''}`}
          onClick={() => setActivePage('invite-email')}
        >
          ✉️ Personel Davet E-postası
        </button>

        <button
          type="button"
          className={`filter-chip ${activePage === 'offer-email' ? 'filter-chip-active' : ''}`}
          onClick={() => setActivePage('offer-email')}
        >
          📧 Teklif E-posta Şablonu
        </button>

        <button
          type="button"
          className={`filter-chip ${activePage === 'offer-pdf' ? 'filter-chip-active' : ''}`}
          onClick={() => setActivePage('offer-pdf')}
        >
          📄 Teklif PDF Şablonu
        </button>

        <button
          type="button"
          className={`filter-chip ${activePage === 'contract-email' ? 'filter-chip-active' : ''}`}
          onClick={() => setActivePage('contract-email')}
        >
          ✉️ Sözleşme E-posta Şablonu
        </button>

        <button
          type="button"
          className={`filter-chip ${activePage === 'contract-pdf' ? 'filter-chip-active' : ''}`}
          onClick={() => setActivePage('contract-pdf')}
        >
          📜 Sözleşme PDF Şablonu
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* PAGE 1: SÖZLEŞME PDF ŞABLONU WITH RICH TEXT TOOLBAR & SINGLE TEXT AREA */}
        {activePage === 'contract-pdf' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* LEFT FORM EDITORS WITH RICH TEXT TOOLBAR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#ec4899' }}>
                  📜 Sözleşme PDF Belgesi & Tüm Hukuki Maddeler Editörü
                </h4>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Sözleşme Başlığı</span>
                  <input
                    type="text"
                    value={templates.contractPdf.contractTitle}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        contractPdf: { ...templates.contractPdf, contractTitle: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>OSGB Yetki & Sicil Belge Bilgileri (Üst Bilgi)</span>
                  <input
                    type="text"
                    value={templates.contractPdf.osgbDocDetails}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        contractPdf: { ...templates.contractPdf, osgbDocDetails: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                {/* RICH TEXT FORMATTING TOOLBAR */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Tüm Sözleşme Maddeleri Metni (Serbest Metin)</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Biçimlendirme Araç Çubuğu ➔</span>
                  </div>

                  {/* TOOLBAR BUTTONS */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      background: 'var(--surface-strong)',
                      padding: '6px 10px',
                      borderRadius: '10px 10px 0 0',
                      border: '1px solid var(--border)',
                      borderBottom: 'none',
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}
                  >
                    <button
                      type="button"
                      title="Kalın (Bold)"
                      style={{ padding: '3px 10px', fontWeight: 900, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                      onClick={() => insertFormatting('<b>', '</b>')}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      title="İtalik (Italic)"
                      style={{ padding: '3px 10px', fontStyle: 'italic', fontWeight: 700, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                      onClick={() => insertFormatting('<i>', '</i>')}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      title="Altı Çizili (Underline)"
                      style={{ padding: '3px 10px', textDecoration: 'underline', fontWeight: 700, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                      onClick={() => insertFormatting('<u>', '</u>')}
                    >
                      U
                    </button>
                    <button
                      type="button"
                      title="Yeni Madde Ekle"
                      style={{ padding: '3px 8px', fontSize: '0.76rem', fontWeight: 700, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                      onClick={() => insertFormatting('\n\n<b>MADDE X - YENİ MADDE BAŞLIĞI:</b> ')}
                    >
                      + Madde
                    </button>
                    <button
                      type="button"
                      title="Madde İmi"
                      style={{ padding: '3px 8px', fontSize: '0.76rem', fontWeight: 700, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                      onClick={() => insertFormatting('• ')}
                    >
                      • Liste
                    </button>

                    <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />

                    {/* DYNAMIC TAG BUTTONS */}
                    {['{FIRMA_ADI}', '{MUSTERI_ADI}', '{SOZLESME_NO}', '{BASTAR_TARIHI}', '{BITIS_TARIHI}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        style={{ padding: '2px 6px', fontSize: '0.72rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                        onClick={() => insertFormatting(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={contractTextareaRef}
                    rows={14}
                    value={templates.contractPdf.contractFullText}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        contractPdf: { ...templates.contractPdf, contractFullText: e.target.value }
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.84rem',
                      fontFamily: 'monospace',
                      lineHeight: 1.5,
                      borderRadius: '0 0 10px 10px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* INFORMATION BOX FOR DYNAMIC LINE ITEMS */}
                <div style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: 10, padding: 12, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  <strong style={{ color: '#ec4899', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    ⚡ Sözleşme Hizmet Kalemleri Tablosu Entegrasyonu
                  </strong>
                  <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.45, fontSize: '0.78rem' }}>
                    Sözleşme imzalanırken seçilen <strong>1 ila 20+</strong> tüm hizmet kalemleri, atanan personel sayıları ve taahhüt edilen aylık/yıllık bedeller PDF sözleşme çıktısında maddelerin ardından otomatik tablo halinde basılır.
                  </p>
                </div>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>PDF Alt Bilgi (Footer) Notu</span>
                  <input
                    type="text"
                    value={templates.contractPdf.footerText}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        contractPdf: { ...templates.contractPdf, footerText: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={templates.contractPdf.showSignatureBlock}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        contractPdf: { ...templates.contractPdf, showSignatureBlock: e.target.checked }
                      })
                    }
                  />
                  <span>Çift Taraflı Kaşe & İmza Bloklarını Sözleşme PDF'inde Göster</span>
                </label>
              </div>
            </div>

            {/* RIGHT SIDE: LIVE A4 PDF CONTRACT DOCUMENT PREVIEW */}
            <div style={{ position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="eyebrow" style={{ color: '#ec4899', fontWeight: 800 }}>👁️ SÖZLEŞME PDF ÇIKTI CANLI ÖNİZLEMESİ</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>A4 Baskı Formatı</span>
              </div>

              {/* A4 DOCUMENT PAPER SIMULATION */}
              <div
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  padding: 24,
                  borderRadius: 12,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                {/* PDF HEADER & BRANDING */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #ec4899', paddingBottom: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {companyLogoUrl ? (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={companyLogoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: '#ec4899', color: '#fff', fontWeight: 900, display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                        OSGB
                      </div>
                    )}
                    <div>
                      <strong style={{ fontSize: '0.98rem', color: '#0f172a', display: 'block' }}>{companyDisplayName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{templates.contractPdf.osgbDocDetails}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                      SÖZLEŞME NO: SZL-2026-042
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: 3 }}>
                      Tarih: {new Date().toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* CONTRACT TITLE */}
                <h3 style={{ margin: '0 0 14px 0', textAlign: 'center', fontSize: '1.05rem', color: '#831843', letterSpacing: '0.04em', fontWeight: 800 }}>
                  {templates.contractPdf.contractTitle}
                </h3>

                {/* PARTIES INFO GRID */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.76rem' }}>
                  <div>
                    <strong style={{ color: '#0369a1', display: 'block', fontSize: '0.74rem' }}>HİZMET VEREN OSGB:</strong>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{companyDisplayName}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#15803d', display: 'block', fontSize: '0.74rem' }}>HİZMET ALAN İŞVEREN:</strong>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>Alfa Lojistik ve Taşımacılık A.Ş.</span>
                  </div>
                </div>

                {/* FULL FORMATTED CONTRACT ARTICLES TEXT */}
                <div style={{ marginBottom: 14 }}>
                  {renderFormattedContractHtml(templates.contractPdf.contractFullText)}
                </div>

                {/* DYNAMIC CONTRACT SERVICE ITEMS TABLE */}
                <div style={{ border: '1.5px dashed #ec4899', borderRadius: 8, padding: 8, marginBottom: 14, background: 'rgba(236, 72, 153, 0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      ⚡ SÖZLEŞME HİZMET KALEMLERİ VE TAAHHÜT EDİLEN BEDELLER TABLOSU
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>* Sözleşme kalemleri buraya otomatik akar.</span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                    <thead>
                      <tr style={{ background: '#fce7f3', borderBottom: '1.5px solid #f472b6', textAlign: 'left' }}>
                        <th style={{ padding: '5px 6px', color: '#831843' }}>#</th>
                        <th style={{ padding: '5px 6px', color: '#831843' }}>Hizmet Kalemi</th>
                        <th style={{ padding: '5px 6px', color: '#831843' }}>Birim</th>
                        <th style={{ padding: '5px 6px', color: '#831843', textAlign: 'center' }}>Miktar</th>
                        <th style={{ padding: '5px 6px', color: '#831843', textAlign: 'right' }}>Aylık Bedel (₺)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewSampleServices.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #fbcfe8' }}>
                          <td style={{ padding: '5px 6px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '5px 6px', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                          <td style={{ padding: '5px 6px', color: '#475569' }}>{item.unit}</td>
                          <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#be185d' }}>
                            ₺{item.lineTotal.toLocaleString('tr-TR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'right', marginTop: 6, fontSize: '0.76rem', fontWeight: 800, color: '#831843' }}>
                    TOPLAM AYLIK HİZMET BEDELİ: ₺{previewSubtotal.toLocaleString('tr-TR')} + KDV
                  </div>
                </div>

                {/* DUAL STAMP & SIGNATURE BLOCK */}
                {templates.contractPdf.showSignatureBlock && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, borderTop: '1px dashed #cbd5e1', paddingTop: 12, marginBottom: 12, fontSize: '0.74rem' }}>
                    <div style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
                      <strong style={{ color: '#831843', display: 'block', marginBottom: 2 }}>HİZMET VEREN (OSGB)</strong>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{companyDisplayName}</span>
                      <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        [Kaşe & Yetkili İmza]
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
                      <strong style={{ color: '#15803d', display: 'block', marginBottom: 2 }}>HİZMET ALAN (İŞVEREN)</strong>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>Alfa Lojistik A.Ş.</span>
                      <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        [Kaşe, Tarih & Yetkili İmza]
                      </div>
                    </div>
                  </div>
                )}

                {/* FOOTER */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
                  {templates.contractPdf.footerText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: TEKLİF PDF ŞABLONU */}
        {activePage === 'offer-pdf' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* LEFT FORM EDITORS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#10b981' }}>
                  📄 Teklif PDF Belgesi, Üst/Alt Bilgi & Hukuki Şartlar Ayarları
                </h4>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>PDF Belge Üst Başlığı</span>
                  <input
                    type="text"
                    value={templates.offerPdf.headerTitle}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        offerPdf: { ...templates.offerPdf, headerTitle: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>OSGB Yetki & Sicil Belge Bilgileri (Üst Bilgi)</span>
                  <input
                    type="text"
                    value={templates.offerPdf.osgbDocDetails}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        offerPdf: { ...templates.offerPdf, osgbDocDetails: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Teklif Ön Yazı & Açıklama Notu Metni</span>
                  <textarea
                    rows={3}
                    value={templates.offerPdf.introNote}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        offerPdf: { ...templates.offerPdf, introNote: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem', fontFamily: 'monospace' }}
                  />
                </label>

                {/* INFORMATION BOX FOR DYNAMIC LINE ITEMS */}
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 10, padding: 12, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  <strong style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    ⚡ Otomatik Hizmet Kalemleri Tablosu Entegrasyonu
                  </strong>
                  <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.45, fontSize: '0.78rem' }}>
                    Burada tek tek teklif kalemleri girilmez. Bir müşteriye teklif hazırlarken eklediğiniz <strong>1 tane veya 20 tane</strong> tüm hizmet kalemleri, birim fiyatları, miktarları ve KDV tutarları PDF çıktısı oluşturulurken bu şablonun gövdesine otomatik olarak eklenir.
                  </p>
                </div>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Hukuki Geçerlilik ve Ödeme Şartları</span>
                  <textarea
                    rows={4}
                    value={templates.offerPdf.termsAndConditions}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        offerPdf: { ...templates.offerPdf, termsAndConditions: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem', fontFamily: 'monospace' }}
                  />
                </label>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>PDF Alt Bilgi (Footer) İletişim Notu</span>
                  <input
                    type="text"
                    value={templates.offerPdf.footerText}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        offerPdf: { ...templates.offerPdf, footerText: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={templates.offerPdf.showSignatureBlock}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        offerPdf: { ...templates.offerPdf, showSignatureBlock: e.target.checked }
                      })
                    }
                  />
                  <span>Çift Taraflı Kaşe & İmza Bloklarını PDF Çıktısında Göster</span>
                </label>
              </div>
            </div>

            {/* RIGHT SIDE: LIVE A4 PDF DOCUMENT PREVIEW */}
            <div style={{ position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="eyebrow" style={{ color: '#10b981', fontWeight: 800 }}>👁️ TEKLİF PDF ÇIKTI CANLI ÖNİZLEMESİ</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>A4 Baskı Formatı</span>
              </div>

              {/* A4 DOCUMENT PAPER SIMULATION */}
              <div
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  padding: 24,
                  borderRadius: 12,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                {/* 1. PDF HEADER & BRANDING */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284c7', paddingBottom: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {companyLogoUrl ? (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={companyLogoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: '#0284c7', color: '#fff', fontWeight: 900, display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>
                        OSGB
                      </div>
                    )}
                    <div>
                      <strong style={{ fontSize: '0.98rem', color: '#0f172a', display: 'block' }}>{companyDisplayName}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{templates.offerPdf.osgbDocDetails}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                      TEKLİF NO: TKL-2026-089
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: 3 }}>
                      Tarih: {new Date().toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* DOCUMENT TITLE */}
                <h3 style={{ margin: '0 0 12px 0', textAlign: 'center', fontSize: '1.05rem', color: '#0369a1', letterSpacing: '0.04em', fontWeight: 800 }}>
                  {templates.offerPdf.headerTitle}
                </h3>

                {/* 2. CUSTOMER & WORKPLACE INFO GRID */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 12, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10, fontSize: '0.76rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>TEKLİF SUNULAN MÜŞTERİ FİRMA:</span>
                    <strong style={{ color: '#0f172a', fontSize: '0.84rem' }}>Alfa Lojistik ve Taşımacılık A.Ş.</strong>
                    <span style={{ color: '#334155', display: 'block' }}>Yetkili: Mehmet Kaya (İnsan Kaynakları Müdürü)</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>İŞYERİ TEHLİKE SINIFI & KADRO:</span>
                    <strong style={{ color: '#d97706' }}>🛑 Çok Tehlikeli Sınıf (NACE: 49.41)</strong>
                    <span style={{ color: '#334155', display: 'block' }}>Aktif Personel: <strong>128 Çalışan</strong></span>
                  </div>
                </div>

                {/* INTRO NOTE */}
                <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#334155', lineHeight: 1.4, fontStyle: 'italic', background: '#fff', borderLeft: '3px solid #0284c7', paddingLeft: 8 }}>
                  {templates.offerPdf.introNote}
                </p>

                {/* DYNAMIC SERVICE TABLE BADGE & PLACEHOLDER PREVIEW */}
                <div style={{ border: '1.5px dashed #0284c7', borderRadius: 8, padding: 8, marginBottom: 12, background: 'rgba(2, 132, 199, 0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                      ⚡ DİNAMİK KALEM TABLOSU ALANI (1 ila 20+ KALEM)
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>* Teklif oluşturulurken eklenen kalemler bu alana otomatik akar.</span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '5px 6px', color: '#334155' }}>#</th>
                        <th style={{ padding: '5px 6px', color: '#334155' }}>Hizmet Kalemi</th>
                        <th style={{ padding: '5px 6px', color: '#334155' }}>Birim</th>
                        <th style={{ padding: '5px 6px', color: '#334155', textAlign: 'center' }}>Miktar</th>
                        <th style={{ padding: '5px 6px', color: '#334155', textAlign: 'right' }}>B.Fiyat (₺)</th>
                        <th style={{ padding: '5px 6px', color: '#334155', textAlign: 'right' }}>Matrah (₺)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewSampleServices.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '5px 6px', color: '#64748b' }}>{idx + 1}</td>
                          <td style={{ padding: '5px 6px', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                          <td style={{ padding: '5px 6px', color: '#475569' }}>{item.unit}</td>
                          <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right' }}>₺{item.unitPrice.toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                            ₺{item.lineTotal.toLocaleString('tr-TR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. FINANCIAL TOTALS BOX */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 14px', width: 220, fontSize: '0.76rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 3 }}>
                      <span>Ara Toplam Matrah:</span>
                      <span>₺{previewSubtotal.toLocaleString('tr-TR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 4 }}>
                      <span>KDV Tutarı (%20):</span>
                      <span>₺{previewVat.toLocaleString('tr-TR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, fontSize: '0.84rem', borderTop: '1.5px solid #0284c7', paddingTop: 4 }}>
                      <span>GENEL TOPLAM:</span>
                      <span style={{ color: '#0284c7' }}>₺{previewGrandTotal.toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                </div>

                {/* 5. TERMS & CONDITIONS BOX */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: '0.7rem', color: '#475569' }}>
                  <strong style={{ color: '#1e293b', display: 'block', marginBottom: 4, fontSize: '0.74rem' }}> Teklif Şartları & Ödeme Koşulları:</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', margin: 0, lineHeight: 1.45 }}>
                    {templates.offerPdf.termsAndConditions}
                  </pre>
                </div>

                {/* 6. DUAL STAMP & SIGNATURE BLOCK */}
                {templates.offerPdf.showSignatureBlock && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, borderTop: '1px dashed #cbd5e1', paddingTop: 10, marginBottom: 10, fontSize: '0.72rem' }}>
                    <div style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                      <strong style={{ color: '#0369a1', display: 'block', marginBottom: 2 }}>TEKLİF EDEN (OSGB)</strong>
                      <span style={{ color: '#64748b', display: 'block' }}>{companyDisplayName}</span>
                      <div style={{ height: 35, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        [Kaşe & Yetkili İmza]
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                      <strong style={{ color: '#15803d', display: 'block', marginBottom: 2 }}>KABUL EDEN (MÜŞTERİ)</strong>
                      <span style={{ color: '#64748b', display: 'block' }}>Alfa Lojistik A.Ş.</span>
                      <div style={{ height: 35, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        [Kaşe, Tarih & Onay İmzası]
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. FOOTER */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
                  {templates.offerPdf.footerText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3: TEKLİF E-POSTA ŞABLONU */}
        {activePage === 'offer-email' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* LEFT: SETTINGS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: 'var(--accent)' }}>
                  ⚙️ Müşteri Teklif İletim E-postası Ayarları
                </h4>

                <label className="select-field" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>E-posta Konu Başlığı *</span>
                  <input
                    type="text"
                    required
                    value={templates.offerEmail.subject}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        offerEmail: { ...templates.offerEmail, subject: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>E-posta Gövde Metni *</span>
                  <textarea
                    rows={10}
                    required
                    value={templates.offerEmail.body}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        offerEmail: { ...templates.offerEmail, body: e.target.value }
                      })
                    }
                    style={{ padding: '10px 12px', fontSize: '0.86rem', lineHeight: 1.5, fontFamily: 'monospace' }}
                  />
                </label>

                <div style={{ background: 'var(--surface-strong)', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginTop: 12 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                    Dinamik Değişken Rozetleri (Tıklayıp Ekle):
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['{MUSTERI_YETKILISI}', '{MUSTERI_ADI}', '{TEKLIF_NO}', '{TOPLAM_TUTAR}', '{GECERLILIK_TARIHI}', '{ONLINE_TEKLIF_LINKI}', '{FIRMA_ADI}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="mini-badge"
                        style={{ cursor: 'pointer', background: 'var(--bg-main)', border: '1px solid var(--border)' }}
                        onClick={() =>
                          setTemplates({
                            ...templates,
                            offerEmail: {
                              ...templates.offerEmail,
                              body: templates.offerEmail.body + ' ' + tag
                            }
                          })
                        }
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div style={{ position: 'sticky', top: 20 }}>
              <span className="eyebrow" style={{ color: '#10b981', fontWeight: 800 }}>👁️ CANLI E-POSTA ÖNİZLEME</span>
              <div style={{ background: '#ffffff', color: '#1f2937', padding: 20, borderRadius: 12, marginTop: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <div style={{ borderBottom: '1.5px solid #e5e7eb', paddingBottom: 10, marginBottom: 14 }}>
                  <strong style={{ fontSize: '0.9rem', display: 'block', color: '#1f2937' }}>
                    Konu: {templates.offerEmail.subject.replace('{FIRMA_ADI}', companyDisplayName).replace('{TEKLIF_NO}', 'TKL-2026-089')}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Alıcı: mehmet.kaya@alfalojistik.com</span>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '0.86rem', lineHeight: 1.5, margin: 0, color: '#374151' }}>
                  {templates.offerEmail.body
                    .replace('{MUSTERI_YETKILISI}', 'Mehmet Kaya')
                    .replace('{MUSTERI_ADI}', 'Alfa Lojistik A.Ş.')
                    .replace('{TEKLIF_NO}', 'TKL-2026-089')
                    .replace('{TOPLAM_TUTAR}', '₺40.512')
                    .replace('{KDV_DURUMU}', 'KDV Dahil')
                    .replace('{GECERLILIK_TARIHI}', '25.08.2026')
                    .replace('{ONLINE_TEKLIF_LINKI}', 'https://app.codentra.com.tr/online-offer/TKL-2026-089')

                    .replace('{FIRMA_ADI}', companyDisplayName)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: SÖZLEŞME E-POSTA ŞABLONU */}
        {activePage === 'contract-email' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* LEFT: SETTINGS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: 'var(--accent)' }}>
                  ⚙️ Müşteri Sözleşme İletim E-postası Ayarları
                </h4>

                <label className="select-field" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>E-posta Konu Başlığı *</span>
                  <input
                    type="text"
                    required
                    value={templates.contractEmail.subject}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        contractEmail: { ...templates.contractEmail, subject: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>E-posta Gövde Metni *</span>
                  <textarea
                    rows={10}
                    required
                    value={templates.contractEmail.body}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        contractEmail: { ...templates.contractEmail, body: e.target.value }
                      })
                    }
                    style={{ padding: '10px 12px', fontSize: '0.86rem', lineHeight: 1.5, fontFamily: 'monospace' }}
                  />
                </label>

                <div style={{ background: 'var(--surface-strong)', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginTop: 12 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                    Dinamik Değişken Rozetleri (Tıklayıp Ekle):
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['{MUSTERI_YETKILISI}', '{MUSTERI_ADI}', '{SOZLESME_NO}', '{BASTAR_TARIHI}', '{BITIS_TARIHI}', '{AYLIK_TUTAR}', '{ONLINE_SOZLESME_LINKI}', '{FIRMA_ADI}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="mini-badge"
                        style={{ cursor: 'pointer', background: 'var(--bg-main)', border: '1px solid var(--border)' }}
                        onClick={() =>
                          setTemplates({
                            ...templates,
                            contractEmail: {
                              ...templates.contractEmail,
                              body: templates.contractEmail.body + ' ' + tag
                            }
                          })
                        }
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div style={{ position: 'sticky', top: 20 }}>
              <span className="eyebrow" style={{ color: '#ec4899', fontWeight: 800 }}>👁️ CANLI E-POSTA ÖNİZLEME</span>
              <div style={{ background: '#ffffff', color: '#1f2937', padding: 20, borderRadius: 12, marginTop: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <div style={{ borderBottom: '1.5px solid #e5e7eb', paddingBottom: 10, marginBottom: 14 }}>
                  <strong style={{ fontSize: '0.9rem', display: 'block', color: '#1f2937' }}>
                    Konu: {templates.contractEmail.subject.replace('{FIRMA_ADI}', companyDisplayName).replace('{SOZLESME_NO}', 'SZL-2026-042')}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Alıcı: mehmet.kaya@alfalojistik.com</span>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '0.86rem', lineHeight: 1.5, margin: 0, color: '#374151' }}>
                  {templates.contractEmail.body
                    .replace('{MUSTERI_YETKILISI}', 'Mehmet Kaya')
                    .replace('{MUSTERI_ADI}', 'Alfa Lojistik A.Ş.')
                    .replace('{SOZLESME_NO}', 'SZL-2026-042')
                    .replace('{BASTAR_TARIHI}', '01.08.2026')
                    .replace('{BITIS_TARIHI}', '01.08.2027')
                    .replace('{AYLIK_TUTAR}', '₺40.512')
                    .replace('{ONLINE_SOZLESME_LINKI}', 'https://app.codentra.com.tr/online-contract/SZL-2026-042')

                    .replace('{FIRMA_ADI}', companyDisplayName)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 5: PERSONEL DAVET E-POSTASI */}
        {activePage === 'invite-email' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            {/* LEFT: SETTINGS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--surface-subtle)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: 'var(--accent)' }}>
                  ⚙️ Personel & Danışman Davet E-postası Ayarları
                </h4>

                <label className="select-field" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>E-posta Konu Başlığı *</span>
                  <input
                    type="text"
                    required
                    value={templates.employeeInvite.subject}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        employeeInvite: { ...templates.employeeInvite, subject: e.target.value }
                      })
                    }
                    style={{ padding: '9px 12px', fontSize: '0.86rem' }}
                  />
                </label>

                <label className="select-field">
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>E-posta Gövde Metni *</span>
                  <textarea
                    rows={10}
                    required
                    value={templates.employeeInvite.body}
                    onChange={(e) =>
                      setTemplates({
                        ...templates,
                        employeeInvite: { ...templates.employeeInvite, body: e.target.value }
                      })
                    }
                    style={{ padding: '10px 12px', fontSize: '0.86rem', lineHeight: 1.5, fontFamily: 'monospace' }}
                  />
                </label>

                <div style={{ background: 'var(--surface-strong)', padding: 12, borderRadius: 10, border: '1px solid var(--border)', marginTop: 12 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                    Dinamik Değişken Rozetleri (Tıklayıp Ekle):
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['{PERSONEL_ADI}', '{FIRMA_ADI}', '{AKTIVASYON_LINKI}'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="mini-badge"
                        style={{ cursor: 'pointer', background: 'var(--bg-main)', border: '1px solid var(--border)' }}
                        onClick={() =>
                          setTemplates({
                            ...templates,
                            employeeInvite: {
                              ...templates.employeeInvite,
                              body: templates.employeeInvite.body + ' ' + tag
                            }
                          })
                        }
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div style={{ position: 'sticky', top: 20 }}>
              <span className="eyebrow" style={{ color: '#10b981', fontWeight: 800 }}>👁️ CANLI E-POSTA ÖNİZLEME</span>
              <div style={{ background: '#ffffff', color: '#1f2937', padding: 20, borderRadius: 12, marginTop: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <div style={{ borderBottom: '1.5px solid #e5e7eb', paddingBottom: 10, marginBottom: 14 }}>
                  <strong style={{ fontSize: '0.9rem', display: 'block', color: '#1f2937' }}>
                    Konu: {templates.employeeInvite.subject.replace('{FIRMA_ADI}', companyDisplayName)}
                  </strong>
                  <span style={{ fontSize: '0.76rem', color: '#6b7280' }}>Alıcı: oguz.vardar@firmamiz.com</span>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', fontSize: '0.86rem', lineHeight: 1.5, margin: 0, color: '#374151' }}>
                  {templates.employeeInvite.body
                    .replace('{PERSONEL_ADI}', 'Oğuz Vardar')
                    .replace('{FIRMA_ADI}', companyDisplayName)
                    .replace('{AKTIVASYON_LINKI}', 'https://app.codentra.com.tr/set-password?token=XYZ_123')}

                </pre>
              </div>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-action-primary" style={{ padding: '10px 24px', fontSize: '0.9rem', background: '#10b981' }}>
            💾 Şablon Değişikliklerini Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}
