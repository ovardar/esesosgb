import React, { useState } from 'react';
import { ContractRevision, ContractServiceLine } from '../types';

type Props = {
  currentRev: ContractRevision;
  prevRev: ContractRevision | null;
};

export type LineDiffResult = {
  id: string;
  serviceName: string;
  unit: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  oldUnitPrice: number | null;
  newUnitPrice: number | null;
  oldQuantity: number | null;
  newQuantity: number | null;
  oldLineTotal: number | null;
  newLineTotal: number | null;
  priceChangePercent: number | null;
  lineTotalDiff: number;
};

export function computeContractRevisionDiff(currentRev: ContractRevision, prevRev: ContractRevision | null) {
  const lineDiffs: LineDiffResult[] = [];

  const currServices = currentRev.services || [];
  const prevServices = prevRev ? prevRev.services || [] : [];

  const oldGrandTotal = prevRev ? (prevRev.grandTotal || prevRev.subtotal || 0) : 0;
  const newGrandTotal = currentRev.grandTotal || currentRev.subtotal || 0;
  const grandTotalDiff = newGrandTotal - oldGrandTotal;
  const overallPercentage = oldGrandTotal > 0 ? ((newGrandTotal - oldGrandTotal) / oldGrandTotal) * 100 : 0;

  // Track matched previous ids/names
  const matchedPrevIndexes = new Set<number>();

  currServices.forEach((currItem, idx) => {
    // Try to find matching item in prevServices by id or serviceName
    const prevIdx = prevServices.findIndex((p, pIdx) => !matchedPrevIndexes.has(pIdx) && (p.id === currItem.id || p.serviceName.trim().toLowerCase() === currItem.serviceName.trim().toLowerCase()));

    if (prevIdx !== -1) {
      matchedPrevIndexes.add(prevIdx);
      const prevItem = prevServices[prevIdx];

      const oldPrice = Number(prevItem.unitPrice) || 0;
      const newPrice = Number(currItem.unitPrice) || 0;
      const oldQty = Number(prevItem.quantity) || 0;
      const newQty = Number(currItem.quantity) || 0;
      const oldTot = prevItem.lineTotal || (oldQty * oldPrice);
      const newTot = currItem.lineTotal || (newQty * newPrice);

      const priceDiffPercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;
      const totalDiff = newTot - oldTot;

      const isModified = oldPrice !== newPrice || oldQty !== newQty || oldTot !== newTot;

      lineDiffs.push({
        id: currItem.id || `curr-${idx}`,
        serviceName: currItem.serviceName,
        unit: currItem.unit,
        status: isModified ? 'modified' : 'unchanged',
        oldUnitPrice: oldPrice,
        newUnitPrice: newPrice,
        oldQuantity: oldQty,
        newQuantity: newQty,
        oldLineTotal: oldTot,
        newLineTotal: newTot,
        priceChangePercent: priceDiffPercent,
        lineTotalDiff: totalDiff
      });
    } else {
      // Newly added item
      const newPrice = Number(currItem.unitPrice) || 0;
      const newQty = Number(currItem.quantity) || 0;
      const newTot = currItem.lineTotal || (newQty * newPrice);

      lineDiffs.push({
        id: currItem.id || `curr-add-${idx}`,
        serviceName: currItem.serviceName,
        unit: currItem.unit,
        status: 'added',
        oldUnitPrice: null,
        newUnitPrice: newPrice,
        oldQuantity: null,
        newQuantity: newQty,
        oldLineTotal: null,
        newLineTotal: newTot,
        priceChangePercent: null,
        lineTotalDiff: newTot
      });
    }
  });

  // Check for items in prevServices that were removed in currServices
  prevServices.forEach((prevItem, pIdx) => {
    if (!matchedPrevIndexes.has(pIdx)) {
      const oldPrice = Number(prevItem.unitPrice) || 0;
      const oldQty = Number(prevItem.quantity) || 0;
      const oldTot = prevItem.lineTotal || (oldQty * oldPrice);

      lineDiffs.push({
        id: prevItem.id || `prev-rem-${pIdx}`,
        serviceName: prevItem.serviceName,
        unit: prevItem.unit,
        status: 'removed',
        oldUnitPrice: oldPrice,
        newUnitPrice: null,
        oldQuantity: oldQty,
        newQuantity: null,
        oldLineTotal: oldTot,
        newLineTotal: null,
        priceChangePercent: null,
        lineTotalDiff: -oldTot
      });
    }
  });

  const modifiedCount = lineDiffs.filter((d) => d.status === 'modified').length;
  const addedCount = lineDiffs.filter((d) => d.status === 'added').length;
  const removedCount = lineDiffs.filter((d) => d.status === 'removed').length;
  const unchangedCount = lineDiffs.filter((d) => d.status === 'unchanged').length;

  return {
    lineDiffs,
    oldGrandTotal,
    newGrandTotal,
    grandTotalDiff,
    overallPercentage,
    modifiedCount,
    addedCount,
    removedCount,
    unchangedCount
  };
}

export function ContractRevisionDiffView({ currentRev, prevRev }: Props) {
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);

  const diffData = computeContractRevisionDiff(currentRev, prevRev);

  const filteredDiffs = showOnlyChanges
    ? diffData.lineDiffs.filter((d) => d.status !== 'unchanged')
    : diffData.lineDiffs;

  if (!prevRev) {
    return (
      <div style={{ background: 'var(--surface-subtle)', padding: 12, borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        ℹ️ Sözleşmenin ilk versiyonudur (Rev. 1). Karşılaştırılacak bir önceki revizyon bulunmamaktadır.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
      {/* OVERALL IMPACT SUMMARY CARD */}
      <div style={{ background: 'var(--bg-main)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent)' }}>
              📊 Rev. {prevRev.revisionNo} ➔ Rev. {currentRev.revisionNo} Karşılaştırması
            </span>
            {diffData.overallPercentage !== 0 && (
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  background: diffData.overallPercentage > 0 ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)',
                  color: diffData.overallPercentage > 0 ? '#10b981' : '#ef4444',
                  border: diffData.overallPercentage > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                {diffData.overallPercentage > 0 ? `+${diffData.overallPercentage.toFixed(1)}% Genel Artış` : `${diffData.overallPercentage.toFixed(1)}% İndirim`}
              </span>
            )}
          </div>

          <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-main)' }}>
            <input
              type="checkbox"
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
            />
            <span>Sadece Değişen Kalemleri Filtrele ({diffData.modifiedCount + diffData.addedCount + diffData.removedCount})</span>
          </label>
        </div>

        {/* METRICS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ background: 'var(--surface-subtle)', padding: 8, borderRadius: 8 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Önceki Genel Toplam:</span>
            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>₺{diffData.oldGrandTotal.toLocaleString('tr-TR')}</strong>
          </div>

          <div style={{ background: 'var(--surface-subtle)', padding: 8, borderRadius: 8 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Yeni Genel Toplam:</span>
            <strong style={{ fontSize: '0.88rem', color: 'var(--accent)' }}>₺{diffData.newGrandTotal.toLocaleString('tr-TR')}</strong>
          </div>

          <div style={{ background: diffData.grandTotalDiff >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', padding: 8, borderRadius: 8 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Net Sözleşme Farkı:</span>
            <strong style={{ fontSize: '0.88rem', color: diffData.grandTotalDiff >= 0 ? '#10b981' : '#ef4444' }}>
              {diffData.grandTotalDiff >= 0 ? `+₺${diffData.grandTotalDiff.toLocaleString('tr-TR')}` : `-₺${Math.abs(diffData.grandTotalDiff).toLocaleString('tr-TR')}`}
            </strong>
          </div>

          <div style={{ background: 'var(--surface-subtle)', padding: 8, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.72rem', flexWrap: 'wrap' }}>
            {diffData.modifiedCount > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>✏️ {diffData.modifiedCount} Fiyat Değişti</span>}
            {diffData.addedCount > 0 && <span style={{ color: '#10b981', fontWeight: 700 }}>➕ {diffData.addedCount} Yeni Kalem</span>}
            {diffData.removedCount > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}>➖ {diffData.removedCount} Çıkarıldı</span>}
            {diffData.unchangedCount > 0 && <span style={{ color: 'var(--text-muted)' }}>⚪ {diffData.unchangedCount} Aynı</span>}
          </div>
        </div>
      </div>

      {/* LINE BY LINE DETAILED DIFF TABLE */}
      <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', textAlign: 'left', borderBottom: '1.5px solid var(--border)' }}>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Durum</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Hizmet / Kalem Adı</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Önceki Fiyat (Rev.{prevRev.revisionNo})</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Yeni Fiyat (Rev.{currentRev.revisionNo})</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>Oran (%)</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>Miktar Değişimi</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', textAlign: 'right' }}>Aylık Fark (₺)</th>
            </tr>
          </thead>
          <tbody>
            {filteredDiffs.map((diff) => {
              let badgeBg = 'var(--surface-subtle)';
              let badgeColor = 'var(--text-muted)';
              let badgeLabel = '⚪ Değişmedi';

              if (diff.status === 'added') {
                badgeBg = 'rgba(16, 185, 129, 0.16)';
                badgeColor = '#10b981';
                badgeLabel = '➕ Yeni Ekledi';
              } else if (diff.status === 'removed') {
                badgeBg = 'rgba(239, 68, 68, 0.16)';
                badgeColor = '#ef4444';
                badgeLabel = '➖ Çıkarıldı';
              } else if (diff.status === 'modified') {
                if ((diff.priceChangePercent || 0) > 0) {
                  badgeBg = 'rgba(16, 185, 129, 0.12)';
                  badgeColor = '#10b981';
                  badgeLabel = '🟢 Zam Yapıldı';
                } else if ((diff.priceChangePercent || 0) < 0) {
                  badgeBg = 'rgba(239, 68, 68, 0.12)';
                  badgeColor = '#ef4444';
                  badgeLabel = '🔴 İndirim Yapıldı';
                } else {
                  badgeBg = 'rgba(245, 158, 11, 0.12)';
                  badgeColor = '#d97706';
                  badgeLabel = '✏️ Miktar Güncellendi';
                }
              }

              return (
                <tr key={diff.id} style={{ borderBottom: '1px solid var(--border)', background: diff.status === 'modified' ? 'rgba(2, 132, 199, 0.02)' : diff.status === 'added' ? 'rgba(16, 185, 129, 0.02)' : diff.status === 'removed' ? 'rgba(239, 68, 68, 0.02)' : 'transparent' }}>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 800, background: badgeBg, color: badgeColor }}>
                      {badgeLabel}
                    </span>
                  </td>

                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {diff.serviceName}
                  </td>

                  <td style={{ padding: '8px 10px', color: diff.status === 'removed' ? '#ef4444' : 'var(--text-muted)', textDecoration: diff.status === 'removed' ? 'line-through' : 'none' }}>
                    {diff.oldUnitPrice !== null ? `₺${diff.oldUnitPrice.toLocaleString('tr-TR')} / ${diff.unit}` : '-'}
                  </td>

                  <td style={{ padding: '8px 10px', fontWeight: 700, color: diff.status === 'added' ? '#10b981' : diff.status === 'modified' ? 'var(--accent)' : 'var(--text-main)' }}>
                    {diff.newUnitPrice !== null ? `₺${diff.newUnitPrice.toLocaleString('tr-TR')} / ${diff.unit}` : '-'}
                  </td>

                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    {diff.priceChangePercent !== null && diff.priceChangePercent !== 0 ? (
                      <span style={{ fontWeight: 800, color: diff.priceChangePercent > 0 ? '#10b981' : '#ef4444' }}>
                        {diff.priceChangePercent > 0 ? `+${diff.priceChangePercent.toFixed(1)}%` : `${diff.priceChangePercent.toFixed(1)}%`}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>

                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.78rem' }}>
                    {diff.oldQuantity !== null && diff.newQuantity !== null && diff.oldQuantity !== diff.newQuantity ? (
                      <span style={{ color: '#d97706', fontWeight: 700 }}>
                        {diff.oldQuantity} ➔ {diff.newQuantity} {diff.unit}
                      </span>
                    ) : (
                      <span>{diff.newQuantity || diff.oldQuantity} {diff.unit}</span>
                    )}
                  </td>

                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>
                    {diff.lineTotalDiff !== 0 ? (
                      <span style={{ color: diff.lineTotalDiff > 0 ? '#10b981' : '#ef4444' }}>
                        {diff.lineTotalDiff > 0 ? `+₺${diff.lineTotalDiff.toLocaleString('tr-TR')}` : `-₺${Math.abs(diff.lineTotalDiff).toLocaleString('tr-TR')}`}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>₺0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
