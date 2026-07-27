import React from 'react';
import { createPortal } from 'react-dom';
import { OfferRecord, ContractRecord, ContractServiceLine } from '../../types';

type OfferPdfPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  offer: OfferRecord | null;
  companyDisplayName?: string;
  companyLogoUrl?: string;
};

type ContractPdfPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractRecord | null;
  companyDisplayName?: string;
  companyLogoUrl?: string;
};

// Helper to retrieve saved template configuration from localStorage
const getSavedTemplates = () => {
  try {
    const saved = localStorage.getItem('crm_tenant_templates_v5');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading tenant templates from localStorage', e);
  }
  return {
    offerPdf: {
      headerTitle: 'KURUMSAL İŞ SAĞLIĞI VE GÜVENLİĞİ HİZMET TEKLİFİ',
      introNote: 'Sayın Yetkili, 6331 sayılı İş Sağlığı ve Güvenliği Kanunu uyarınca firmanızın ihtiyaç duyduğu profesyonel İSG hizmet kalemleri, görevlendirilecek uzman/hekim kadrosu ve birim fiyatlandırma matrisi aşağıda bilgilerinize sunulmuştur.',
      osgbDocDetails: 'İSG-KÂTİP Kurum Yetki Belge No: 4859/İSG • Ticaret Sicil No: 495821 • Büyük Mükellefler V.D. 6190492810',
      termsAndConditions: `1. İşbu teklif hazırlık tarihinden itibaren 30 (otuz) takvim günü süreyle geçerlidir.
2. Belirtilen birim fiyatlara KDV (%20) dahil değildir.
3. Tehlike sınıfı veya çalışan sayısındaki %10'u aşan değişikliklerde birim fiyatlar yeniden düzenlenir.
4. İSG-KÂTİP onayları sözleşme imzalanmasını takiben 3 (üç) iş günü içerisinde tamamlanacaktır.
5. Fatura ödemeleri hizmet ifasını takip eden ayın ilk 5 iş günü içerisinde banka hesabımıza ödenir.`,
      footerText: 'Codentra Teklif ve Sözleşme Yönetimi • Tel: 0850 000 00 00 • E-posta: teklif@codentra.com.tr • Web: www.codentra.com.tr',
      showSignatureBlock: true
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
      footerText: 'Codentra Teklif ve Sözleşme Yönetimi • Tel: 0850 000 00 00 • E-posta: hukuk@codentra.com.tr',

      showSignatureBlock: true
    }
  };
};

export function OfferPdfPreviewModal({
  isOpen,
  onClose,
  offer,
  companyDisplayName = 'Codentra Teklif ve Sözleşme Yönetimi',
  companyLogoUrl
}: OfferPdfPreviewModalProps) {
  if (!isOpen || !offer) return null;

  const savedTemplates = getSavedTemplates();
  const templateConfig = savedTemplates.offerPdf;

  const currentRev = offer.revisions ? offer.revisions[offer.revisions.length - 1] : null;
  const services = currentRev ? currentRev.services : [];
  const subtotal = currentRev ? currentRev.subtotal : 0;
  const discountTotal = currentRev ? currentRev.discountTotal : 0;
  const taxAmount = currentRev ? currentRev.taxAmount : 0;
  const grandTotal = currentRev ? currentRev.grandTotal : 0;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '30px 16px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 880,
          width: '100%',
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
          padding: '32px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL ACTION BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0284c7', paddingBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {companyLogoUrl ? (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={companyLogoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#0284c7', color: '#fff', fontWeight: 900, display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>
                OSGB
              </div>
            )}
            <div>
              <strong style={{ fontSize: '0.98rem', color: '#0f172a', display: 'block' }}>{companyDisplayName}</strong>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{templateConfig.osgbDocDetails}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn-action-primary"
              onClick={() => window.print()}
              style={{ padding: '8px 16px', fontSize: '0.86rem', background: '#0284c7', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              🖨️ PDF İndir / Yazdır
            </button>
            <button
              type="button"
              className="btn-action-ghost"
              onClick={onClose}
              style={{ padding: '8px 14px', fontSize: '0.86rem', background: '#f1f5f9', color: '#334155', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕ Kapat
            </button>
          </div>
        </div>

        {/* DOCUMENT TITLE */}
        <h3 style={{ margin: '4px 0 0 0', textAlign: 'center', fontSize: '1.05rem', color: '#0369a1', letterSpacing: '0.04em', fontWeight: 800 }}>
          {templateConfig.headerTitle}
        </h3>

        {/* CUSTOMER & OFFER INFO GRID */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12, fontSize: '0.78rem' }}>
          <div>
            <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>TEKLİF SUNULAN MÜŞTERİ FİRMA:</span>
            <strong style={{ color: '#0f172a', fontSize: '0.9rem', display: 'block' }}>{offer.customerName}</strong>
            <span style={{ color: '#334155', display: 'block', marginTop: 2 }}>Konu: {offer.subject}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
              TEKLİF NO: {offer.offerNo} (Rev. {offer.currentRevisionNo})
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: 4 }}>Tarih: {offer.createdDate}</span>
            <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 600, display: 'block' }}>Geçerlilik: {offer.validUntilDate}</span>
          </div>
        </div>

        {/* INTRO NOTE */}
        <p style={{ margin: 0, fontSize: '0.76rem', color: '#334155', lineHeight: 1.45, fontStyle: 'italic', background: '#fff', borderLeft: '3px solid #0284c7', paddingLeft: 10 }}>
          {templateConfig.introNote}
        </p>

        {/* DYNAMIC SERVICE ITEMS TABLE */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: '7px 10px', color: '#334155' }}>#</th>
                <th style={{ padding: '7px 10px', color: '#334155' }}>Hizmet Kalemi</th>
                <th style={{ padding: '7px 10px', color: '#334155' }}>Birim</th>
                <th style={{ padding: '7px 10px', color: '#334155', textAlign: 'center' }}>Miktar</th>
                <th style={{ padding: '7px 10px', color: '#334155', textAlign: 'right' }}>Birim Fiyat (₺)</th>
                <th style={{ padding: '7px 10px', color: '#334155', textAlign: 'right' }}>Matrah (₺)</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '7px 10px', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a' }}>{item.serviceName}</td>
                  <td style={{ padding: '7px 10px', color: '#475569' }}>{item.unit}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>₺{item.unitPrice.toLocaleString('tr-TR')}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                    ₺{((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FINANCIAL TOTALS BOX */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 16px', width: 240, fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 3 }}>
              <span>Ara Toplam Matrah:</span>
              <span>₺{subtotal.toLocaleString('tr-TR')}</span>
            </div>
            {discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', marginBottom: 3 }}>
                <span>Uygulanan İskonto:</span>
                <span>-₺{discountTotal.toLocaleString('tr-TR')}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 5 }}>
              <span>KDV Tutarı (%20):</span>
              <span>₺{taxAmount.toLocaleString('tr-TR')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, fontSize: '0.88rem', borderTop: '1.5px solid #0284c7', paddingTop: 5 }}>
              <span>GENEL TOPLAM:</span>
              <span style={{ color: '#0284c7' }}>₺{grandTotal.toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>

        {/* TERMS & CONDITIONS */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, fontSize: '0.72rem', color: '#475569' }}>
          <strong style={{ color: '#1e293b', display: 'block', marginBottom: 4, fontSize: '0.76rem' }}>Teklif Şartları & Ödeme Koşulları:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif', margin: 0, lineHeight: 1.45 }}>
            {templateConfig.termsAndConditions}
          </pre>
        </div>

        {/* DUAL STAMP & SIGNATURE BLOCK */}
        {templateConfig.showSignatureBlock && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, borderTop: '1px dashed #cbd5e1', paddingTop: 12, fontSize: '0.74rem' }}>
            <div style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
              <strong style={{ color: '#0369a1', display: 'block', marginBottom: 2 }}>TEKLİF EDEN (OSGB)</strong>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{companyDisplayName}</span>
              <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                [Kaşe & Yetkili İmza]
              </div>
            </div>

            <div style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: 2 }}>KABUL EDEN (MÜŞTERİ)</strong>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{offer.customerName}</span>
              <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                [Kaşe, Tarih & Onay İmzası]
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
          {templateConfig.footerText}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ContractPdfPreviewModal({
  isOpen,
  onClose,
  contract,
  companyDisplayName = 'Codentra Teklif ve Sözleşme Yönetimi',
  companyLogoUrl
}: ContractPdfPreviewModalProps) {
  if (!isOpen || !contract) return null;

  const savedTemplates = getSavedTemplates();
  const templateConfig = savedTemplates.contractPdf;

  const activeRev = contract.revisions && contract.revisions.length > 0
    ? contract.revisions[contract.revisions.length - 1]
    : null;

  const services: ContractServiceLine[] = activeRev ? activeRev.services : [];
  const monthlyTotal = activeRev ? activeRev.subtotal : 0;
  const grandTotal = activeRev ? activeRev.grandTotal : 0;

  const renderFormattedContractHtml = (rawText: string) => {
    if (!rawText) return null;

    let processed = rawText
      .replace(/\{FIRMA_ADI\}/g, companyDisplayName)
      .replace(/\{MUSTERI_ADI\}/g, contract.customerName)
      .replace(/\{SOZLESME_NO\}/g, contract.contractNo)
      .replace(/\{BASTAR_TARIHI\}/g, contract.startDate || '01.01.2026')
      .replace(/\{BITIS_TARIHI\}/g, contract.endDate || '01.01.2027')
      .replace(/\{AYLIK_TUTAR\}/g, grandTotal ? `₺${grandTotal.toLocaleString('tr-TR')}` : 'Belirtilmedi')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>');

    return (
      <div
        style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.78rem', color: '#334155' }}
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '30px 16px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 880,
          width: '100%',
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
          padding: '32px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL ACTION BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ec4899', paddingBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {companyLogoUrl ? (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={companyLogoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: '#ec4899', color: '#fff', fontWeight: 900, display: 'grid', placeItems: 'center', fontSize: '1.1rem' }}>
                OSGB
              </div>
            )}
            <div>
              <strong style={{ fontSize: '0.98rem', color: '#0f172a', display: 'block' }}>{companyDisplayName}</strong>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{templateConfig.osgbDocDetails}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn-action-primary"
              onClick={() => window.print()}
              style={{ padding: '8px 16px', fontSize: '0.86rem', background: '#ec4899', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              🖨️ PDF İndir / Yazdır
            </button>
            <button
              type="button"
              className="btn-action-ghost"
              onClick={onClose}
              style={{ padding: '8px 14px', fontSize: '0.86rem', background: '#f1f5f9', color: '#334155', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕ Kapat
            </button>
          </div>
        </div>

        {/* CONTRACT TITLE */}
        <h3 style={{ margin: '4px 0 0 0', textAlign: 'center', fontSize: '1.05rem', color: '#831843', letterSpacing: '0.04em', fontWeight: 800 }}>
          {templateConfig.contractTitle}
        </h3>

        {/* PARTIES INFO GRID */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.78rem' }}>
          <div>
            <strong style={{ color: '#831843', display: 'block', fontSize: '0.74rem' }}>HİZMET VEREN OSGB:</strong>
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>{companyDisplayName}</span>
          </div>
          <div>
            <strong style={{ color: '#15803d', display: 'block', fontSize: '0.74rem' }}>HİZMET ALAN İŞVEREN:</strong>
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>{contract.customerName}</span>
          </div>
        </div>

        {/* FULL FORMATTED CONTRACT ARTICLES TEXT */}
        <div style={{ marginBottom: 8 }}>
          {renderFormattedContractHtml(templateConfig.contractFullText)}
        </div>

        {/* CONTRACT SERVICE ITEMS TABLE */}
        {services.length > 0 && (
          <div style={{ border: '1px solid #fbcfe8', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: '#fce7f3', padding: '6px 10px', fontSize: '0.76rem', fontWeight: 800, color: '#831843' }}>
              📋 SÖZLEŞME HİZMET KALEMLERİ VE TAAHHÜT EDİLEN BEDELLER
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px', color: '#475569' }}>#</th>
                  <th style={{ padding: '6px 10px', color: '#475569' }}>Hizmet Kalemi</th>
                  <th style={{ padding: '6px 10px', color: '#475569' }}>Birim</th>
                  <th style={{ padding: '6px 10px', color: '#475569', textAlign: 'center' }}>Miktar</th>
                  <th style={{ padding: '6px 10px', color: '#475569', textAlign: 'right' }}>Aylık Bedel (₺)</th>
                </tr>
              </thead>
              <tbody>
                {services.map((item: ContractServiceLine, idx: number) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a' }}>{item.serviceName}</td>
                    <td style={{ padding: '6px 10px', color: '#475569' }}>{item.unit}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#be185d' }}>
                      ₺{((item.lineTotal || (item.quantity * item.unitPrice)) || 0).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', padding: '8px 12px', background: '#fdf2f8', fontSize: '0.82rem', fontWeight: 800, color: '#831843', borderTop: '1px solid #fbcfe8' }}>
              TOPLAM AYLIK HİZMET BEDELİ: ₺{monthlyTotal.toLocaleString('tr-TR')} + KDV
            </div>
          </div>
        )}

        {/* DUAL STAMP & SIGNATURE BLOCK */}
        {templateConfig.showSignatureBlock && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, borderTop: '1px dashed #cbd5e1', paddingTop: 12, fontSize: '0.74rem' }}>
            <div style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
              <strong style={{ color: '#831843', display: 'block', marginBottom: 2 }}>HİZMET VEREN (OSGB)</strong>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{companyDisplayName}</span>
              <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                [Kaşe & Yetkili İmza]
              </div>
            </div>

            <div style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10 }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: 2 }}>HİZMET ALAN (İŞVEREN)</strong>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>{contract.customerName}</span>
              <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                [Kaşe, Tarih & Yetkili İmza]
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
          {templateConfig.footerText}
        </div>
      </div>
    </div>,
    document.body
  );
}
