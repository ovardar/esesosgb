import { useEffect, useState, useMemo } from 'react';
import type { CustomerActivity, CustomerRecord } from './pages/CustomersPage';
import type { SectionId } from '../types';

type NotificationBellProps = {
  customers: CustomerRecord[];
  onUpdateActivityStatus: (customerName: string, activityId: string, newStatus: CustomerActivity['status']) => void;
  onNavigateCustomer: (customerName: string) => void;
  onNavigateSection: (sectionId: SectionId) => void;
};

export function NotificationBell({
  customers,
  onUpdateActivityStatus,
  onNavigateCustomer,
  onNavigateSection
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toastAlert, setToastAlert] = useState<{ id: string; title: string; body: string; timeBadge: string } | null>(null);

  // Compute active reminders (Overdue & Approaching)
  const reminders = useMemo(() => {
    const now = new Date();
    const list: {
      activity: CustomerActivity;
      customerName: string;
      dueDate: Date;
      isOverdue: boolean;
      isApproaching: boolean;
      minutesDiff: number;
      timeBadge: string;
    }[] = [];

    customers.forEach((cust) => {
      (cust.activitiesList || []).forEach((act) => {
        if (act.status !== 'Planlandı') return;

        const dateStr = act.date;
        const timeStr = act.time || '09:00';
        const dueDate = new Date(`${dateStr}T${timeStr}:00`);

        if (isNaN(dueDate.getTime())) return;

        const diffMinutes = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60));

        // Offset check
        const offset = act.reminderOffset || '15m';
        let thresholdMinutes = 15;
        if (offset === 'at_time') thresholdMinutes = 5;
        else if (offset === '30m') thresholdMinutes = 30;
        else if (offset === '1h') thresholdMinutes = 60;
        else if (offset === '1d') thresholdMinutes = 1440;
        else if (offset === 'none') thresholdMinutes = -1;

        const isOverdue = diffMinutes < 0;
        const isApproaching = thresholdMinutes > 0 && diffMinutes >= 0 && diffMinutes <= thresholdMinutes;

        if (isOverdue || isApproaching) {
          let timeBadge = '';
          if (isOverdue) {
            const absMins = Math.abs(diffMinutes);
            if (absMins < 60) timeBadge = `🔴 ${absMins} dk gecikti`;
            else if (absMins < 1440) timeBadge = `🔴 ${Math.floor(absMins / 60)} saat gecikti`;
            else timeBadge = `🔴 ${Math.floor(absMins / 1440)} gün gecikti`;
          } else {
            if (diffMinutes === 0) timeBadge = `⏱️ Tam Zamanı`;
            else if (diffMinutes < 60) timeBadge = `🟡 ${diffMinutes} dk kaldı`;
            else timeBadge = `🟡 ${Math.floor(diffMinutes / 60)} saat kaldı`;
          }

          list.push({
            activity: act,
            customerName: cust.name,
            dueDate,
            isOverdue,
            isApproaching,
            minutesDiff: diffMinutes,
            timeBadge
          });
        }
      });
    });

    return list.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [customers]);

  const overdueCount = reminders.filter((r) => r.isOverdue).length;
  const approachingCount = reminders.filter((r) => r.isApproaching).length;
  const totalBadgeCount = overdueCount + approachingCount;

  // Trigger Toast popup alert when approaching or overdue item exists
  useEffect(() => {
    if (reminders.length > 0 && !toastAlert) {
      const topRem = reminders[0];
      setToastAlert({
        id: topRem.activity.id,
        title: `${topRem.activity.type}: ${topRem.activity.subject}`,
        body: `${topRem.customerName} - ${topRem.activity.date} ${topRem.activity.time || ''}`,
        timeBadge: topRem.timeBadge
      });
    }
  }, [reminders]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* BELL BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: totalBadgeCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-strong)',
          border: totalBadgeCount > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border)',
          borderRadius: '12px',
          padding: '8px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: totalBadgeCount > 0 ? '#ef4444' : 'var(--text-main)',
          fontWeight: 700,
          fontSize: '0.88rem',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ fontSize: '1.1rem', filter: totalBadgeCount > 0 ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))' : 'none' }}>🔔</span>
        <span>Hatırlatıcılar</span>
        {totalBadgeCount > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '20px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
            }}
          >
            {totalBadgeCount}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxHeight: '460px',
            background: 'var(--surface-strong)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
            zIndex: 99999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', display: 'block' }}>
                🔔 Aktivite Hatırlatıcıları
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {totalBadgeCount > 0
                  ? `${overdueCount} gecikmiş, ${approachingCount} yaklaşan aktivite`
                  : 'Tüm aktiviteleriniz güncel'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>

          {/* LIST */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
            {reminders.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: 6 }}>🎉</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Harika! Hatırlatma Yok</strong>
                <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>Yaklaşan veya gecikmiş planlı aktiviteniz bulunmuyor.</p>
              </div>
            ) : (
              reminders.map((item) => (
                <div
                  key={item.activity.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    marginBottom: '6px',
                    background: item.isOverdue ? 'rgba(239, 68, 68, 0.06)' : 'rgba(245, 158, 11, 0.06)',
                    border: item.isOverdue ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: item.isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: item.isOverdue ? '#ef4444' : '#f59e0b' }}>
                      {item.timeBadge}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.activity.date} {item.activity.time || ''}
                    </span>
                  </div>

                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>
                      {item.activity.subject}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                      🏢 {item.customerName} {item.activity.contactPerson ? `• ${item.activity.contactPerson}` : ''}
                    </span>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateActivityStatus(item.customerName, item.activity.id, 'Tamamlandı');
                      }}
                      style={{
                        flex: 1,
                        padding: '5px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: 6,
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Tamamlandı
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateSection('customers');
                        onNavigateCustomer(item.customerName);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '5px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-strong)',
                        color: 'var(--text-main)',
                        cursor: 'pointer'
                      }}
                    >
                      👁️ Müşteriye Git
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FLOATING TOAST ALERT */}
      {toastAlert && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 360,
            background: 'var(--surface-strong)',
            border: '2px solid var(--accent)',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⏰ AKTİVİTE HATIRLATMASI
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              {toastAlert.timeBadge}
            </span>
          </div>

          <div>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', display: 'block' }}>{toastAlert.title}</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block' }}>{toastAlert.body}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setToastAlert(null)}
              style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--text-main)', cursor: 'pointer' }}
            >
              Anladım / Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
