import { useMemo } from 'react';
import type { ContractRecord, OfferRecord, SaaSTenant, SectionId } from '../../types';
import type { CustomerRecord } from './CustomersPage';

type DashboardPageProps = {
  impersonatedTenant?: SaaSTenant | null;
  customers: CustomerRecord[];
  offers: OfferRecord[];
  contracts: ContractRecord[];
  onNavigateSection: (section: SectionId) => void;
  onNavigateCustomer?: (customerName: string) => void;
};

function calculateDaysLeftLocal(dateStr?: string): number {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return 999;
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function DashboardPage({
  impersonatedTenant,
  customers = [],
  offers = [],
  contracts = [],
  onNavigateSection,
  onNavigateCustomer
}: DashboardPageProps) {
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Compute Financial & Operational KPI Stats
  const metrics = useMemo(() => {
    const totalCustomers = customers.length;

    // Monthly Contract Revenue Total (sum of active contract totals)
    let monthlyContractRev = 0;
    contracts.forEach((c) => {
      if (c.stage === 'Aktif' || c.stage === 'Yenilenecek') {
        const lastRev = c.revisions && c.revisions.length > 0 ? c.revisions[c.revisions.length - 1] : null;
        const total = lastRev ? lastRev.grandTotal : 0;
        monthlyContractRev += total;
      }
    });

    // Pending Offers Count & Total
    const pendingOffers = offers.filter((o) => o.status === 'Onay Bekliyor' || o.status === 'Gönderildi' || o.status === 'Revizyon İstendi');
    let pendingOfferSum = 0;
    pendingOffers.forEach((o) => {
      const lastRev = o.revisions && o.revisions.length > 0 ? o.revisions[o.revisions.length - 1] : null;
      pendingOfferSum += lastRev ? lastRev.grandTotal : 0;
    });

    // Expiring Contracts (days left <= 45 or stage Yenilenecek/Süresi Doldu)
    const expiringContracts = contracts.filter((c) => {
      const days = calculateDaysLeftLocal(c.endDate);
      return days <= 45 || c.stage === 'Yenilenecek' || c.stage === 'Süresi Doldu';
    }).sort((a, b) => calculateDaysLeftLocal(a.endDate) - calculateDaysLeftLocal(b.endDate));

    // All Activities
    const allActivities = customers.flatMap((c) =>
      (c.activitiesList || []).map((act) => ({ ...act, customerName: c.name }))
    ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Offer Status Breakdown
    const totalOffers = offers.length || 1;
    const wonCount = offers.filter((o) => o.status === 'Kazanıldı').length;
    const pendingCount = pendingOffers.length;
    const lostCount = offers.filter((o) => o.status === 'Kaybedildi').length;

    return {
      totalCustomers,
      monthlyContractRev,
      pendingOffersCount: pendingOffers.length,
      pendingOfferSum,
      expiringContracts,
      allActivities,
      wonPct: Math.round((wonCount / totalOffers) * 100),
      pendingPct: Math.round((pendingCount / totalOffers) * 100),
      lostPct: Math.round((lostCount / totalOffers) * 100)
    };
  }, [customers, offers, contracts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* 1. EXECUTIVE WELCOME BANNER & QUICK ACTIONS */}
      <article
        style={{
          background: 'var(--surface-strong)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '20px 24px',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'var(--accent)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800
            }}
          >
            👋
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {impersonatedTenant ? `Hoş Geldiniz [${impersonatedTenant.companyName}]` : 'Hoş Geldiniz, Orhan Vardar'}
              </h3>
              {impersonatedTenant ? (
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                  🏢 {impersonatedTenant.companyName}
                </span>
              ) : (
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.76rem', fontWeight: 800, background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                  🛡️ Sistem Yöneticisi (Süper Admin)
                </span>
              )}
            </div>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              📅 {todayFormatted} • Günlük operasyonel ajandanız ve finansal durum özeti
            </span>
          </div>
        </div>

        {/* QUICK ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-action-primary"
            style={{ padding: '9px 16px', fontSize: '0.85rem', background: '#10b981' }}
            onClick={() => onNavigateSection('offers')}
          >
            + Yeni Teklif
          </button>
          <button
            type="button"
            className="btn-action-primary"
            style={{ padding: '9px 16px', fontSize: '0.85rem', background: '#6366f1' }}
            onClick={() => onNavigateSection('contracts')}
          >
            + Yeni Sözleşme
          </button>
          <button
            type="button"
            className="btn-action-ghost"
            style={{ padding: '9px 16px', fontSize: '0.85rem' }}
            onClick={() => onNavigateSection('customers')}
          >
            + Müşteri Ekle
          </button>
          <button
            type="button"
            className="btn-action-ghost"
            style={{ padding: '9px 16px', fontSize: '0.85rem', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.4)' }}
            onClick={() => onNavigateSection('price-lists')}
          >
            ⚡ Toplu Zam Motoru
          </button>
        </div>
      </article>

      {/* 2. KPI METRICS GRID (4 CARDS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <article className="summary-card" style={{ padding: 16, borderLeft: '5px solid #6366f1' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Aktif Müşteri Portföyü</span>
          <strong style={{ fontSize: '1.65rem', color: 'var(--text-main)', display: 'block', margin: '4px 0' }}>
            {metrics.totalCustomers} Firma
          </strong>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
            📈 Son 30 Günde +12 Yeni Kayıt
          </p>
        </article>

        <article className="summary-card" style={{ padding: 16, borderLeft: '5px solid #10b981' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Aylık Düzenli Sözleşme Cirosu</span>
          <strong style={{ fontSize: '1.65rem', color: '#10b981', display: 'block', margin: '4px 0' }}>
            ₺{metrics.monthlyContractRev.toLocaleString('tr-TR')}
          </strong>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            📑 {contracts.filter((c) => c.stage === 'Aktif').length} Aktif İSG Sözleşmesi
          </p>
        </article>

        <article className="summary-card" style={{ padding: 16, borderLeft: '5px solid #f59e0b' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Cevap Bekleyen Teklif Hacmi</span>
          <strong style={{ fontSize: '1.65rem', color: '#d97706', display: 'block', margin: '4px 0' }}>
            ₺{metrics.pendingOfferSum.toLocaleString('tr-TR')}
          </strong>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            ⏳ {metrics.pendingOffersCount} Adet Teklif Takipte
          </p>
        </article>

        <article className="summary-card" style={{ padding: 16, borderLeft: '5px solid #ec4899' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Süresi Dolan / Yenilenecekler</span>
          <strong style={{ fontSize: '1.65rem', color: metrics.expiringContracts.length > 0 ? '#ec4899' : 'var(--text-main)', display: 'block', margin: '4px 0' }}>
            {metrics.expiringContracts.length} Sözleşme
          </strong>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            🛑 Önümüzdeki 45 Gün İçinde
          </p>
        </article>
      </div>

      {/* 3. URGENT ACTION CENTER & PENDING OFFERS (2 COLUMNS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        {/* EXPIRING CONTRACTS WARNING BOARD */}
        <section className="panel panel-elevated" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span className="eyebrow" style={{ color: '#ef4444', fontWeight: 800 }}>🚨 Hukuki Risk & Yenileme Takibi</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Süresi Yaklaşan Hizmet Sözleşmeleri</h3>
            </div>
            <button
              type="button"
              className="btn-action-ghost"
              style={{ fontSize: '0.8rem', padding: '5px 10px' }}
              onClick={() => onNavigateSection('contracts')}
            >
              Tüm Sözleşmeler →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {metrics.expiringContracts.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-subtle)', borderRadius: 10 }}>
                ✅ Yakın zamanda süresi dolacak kritik sözleşme bulunmamaktadır.
              </div>
            ) : (
              metrics.expiringContracts.slice(0, 5).map((cnt) => {
                const daysLeft = calculateDaysLeftLocal(cnt.endDate);
                const lastRev = cnt.revisions && cnt.revisions.length > 0 ? cnt.revisions[cnt.revisions.length - 1] : null;
                const total = lastRev ? lastRev.grandTotal : 0;

                return (
                  <div
                    key={cnt.id}
                    style={{
                      background: daysLeft <= 15 ? 'rgba(239, 68, 68, 0.06)' : 'var(--surface-subtle)',
                      border: daysLeft <= 15 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)' }}>{cnt.customerName}</strong>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>({cnt.contractNo})</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {cnt.contractTitle} • Bitiş: <strong>{cnt.endDate}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--accent)', display: 'block' }}>
                          ₺{total.toLocaleString('tr-TR')} / Ay
                        </strong>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: daysLeft <= 15 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: daysLeft <= 15 ? '#ef4444' : '#d97706'
                          }}
                        >
                          {daysLeft < 0 ? '🛑 Süresi Doldu' : `⏰ ${daysLeft} Gün Kaldı`}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn-action-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#ec4899' }}
                        onClick={() => {
                          if (onNavigateCustomer) onNavigateCustomer(cnt.customerName);
                          else onNavigateSection('contracts');
                        }}
                      >
                        🔄 Yenile
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* PENDING OFFERS & STATUS BREAKDOWN */}
        <section className="panel panel-elevated" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span className="eyebrow" style={{ color: '#3b82f6', fontWeight: 800 }}>✉️ Teklif Takip Akışı</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Cevap Bekleyen Teklifler</h3>
            </div>
            <button
              type="button"
              className="btn-action-ghost"
              style={{ fontSize: '0.8rem', padding: '5px 10px' }}
              onClick={() => onNavigateSection('offers')}
            >
              Tüm Teklifler →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {offers.filter((o) => o.status === 'Onay Bekliyor' || o.status === 'Gönderildi' || o.status === 'Revizyon İstendi').slice(0, 4).map((off) => {
              const lastRev = off.revisions && off.revisions.length > 0 ? off.revisions[off.revisions.length - 1] : null;
              const total = lastRev ? lastRev.grandTotal : 0;

              return (
                <div
                  key={off.id}
                  style={{
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{off.customerName}</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({off.offerNo})</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>{off.subject}</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--accent)', display: 'block' }}>
                      ₺{total.toLocaleString('tr-TR')}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                      ⏳ {off.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TEKLİF KAZANIM İSTATİSTİK ÇUBUĞU */}
          <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: 6 }}>
              <span>Teklif Kazanım Performansı</span>
              <span style={{ color: '#10b981' }}>%{metrics.wonPct} Kazanıldı</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-subtle)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${metrics.wonPct}%`, background: '#10b981' }} />
              <div style={{ width: `${metrics.pendingPct}%`, background: '#f59e0b' }} />
              <div style={{ width: `${metrics.lostPct}%`, background: '#ef4444' }} />
            </div>
          </div>
        </section>
      </div>

      {/* 4. DAILY OPERATIONAL AGENDA */}
      <section className="panel panel-elevated" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <span className="eyebrow" style={{ color: '#6366f1', fontWeight: 800 }}>📅 Saha & Müşteri Ajandası</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Son Ziyaret ve Görüşme Akışı</h3>
          </div>
          <button
            type="button"
            className="btn-action-ghost"
            style={{ fontSize: '0.8rem', padding: '5px 10px' }}
            onClick={() => onNavigateSection('customers')}
          >
            Tüm Aktiviteler →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {metrics.allActivities.slice(0, 4).map((act) => (
            <div
              key={act.id}
              style={{
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', padding: '2px 8px', borderRadius: 10, fontWeight: 800, background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                  {act.type} • {act.date} {act.time && `(${act.time})`}
                </span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: act.status === 'Tamamlandı' ? '#10b981' : '#f59e0b' }}>
                  ● {act.status}
                </span>
              </div>

              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>🏢 {act.customerName}</strong>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{act.subject}</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>👔 Personel: {act.performedBy}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
