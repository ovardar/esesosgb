import { useState } from 'react';
import { SaaSTenant, SaaSPackageDefinition } from '../../types';
import { initialSaaSPackages } from '../../data/saasWorkbench';
import { saveCloudTenants, fetchCloudTenants } from '../../lib/cloudDb';

interface BillingTabProps {
  activeTenant: SaaSTenant;
  onUpdateTenant: (tenant: SaaSTenant) => void;
}

export function BillingTab({ activeTenant, onUpdateTenant }: BillingTabProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(activeTenant.subscriptionPlanId || 'pkg-starter');
  const [billingCycle, setBillingCycle] = useState<'Aylık' | 'Yıllık'>(activeTenant.billingCycle || 'Aylık');
  
  // Mock credit card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedPackage = initialSaaSPackages.find(p => p.id === selectedPlanId);
  const totalAmount = selectedPackage ? (billingCycle === 'Yıllık' ? selectedPackage.annualFee : selectedPackage.monthlyFee) : 0;

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!cardNumber || !cardName || !expiry || !cvv) {
      setErrorMsg('Lütfen tüm kart bilgilerini eksiksiz girin.');
      return;
    }

    setIsProcessing(true);

    // Simulate Network Request / 3D Secure / Stripe mock
    setTimeout(async () => {
      try {
        const tenants = await fetchCloudTenants([]);
        const nextTenants = tenants.map(t => {
          if (t.id === activeTenant.id) {
            return {
              ...t,
              status: 'Aktif',
              paymentStatus: 'Sorunsuz',
              package: selectedPackage?.name.split(' ')[0] as any, // Starter, Pro, Enterprise
              monthlyFee: selectedPackage?.monthlyFee,
              annualFee: selectedPackage?.annualFee,
              billingCycle,
              subscriptionPlanId: selectedPlanId,
              stripeCustomerId: `cus_mock_${Date.now()}` // Mock payment id
            };
          }
          return t;
        });

        await saveCloudTenants(nextTenants);
        
        const updatedTenant = nextTenants.find(t => t.id === activeTenant.id);
        if (updatedTenant) {
          onUpdateTenant(updatedTenant);
          setSuccessMsg('Ödeme başarıyla alındı! Aboneliğiniz aktifleştirildi.');
        }
      } catch (err) {
        setErrorMsg('Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      } finally {
        setIsProcessing(false);
      }
    }, 1500);
  };

  return (
    <section className="panel panel-wide panel-elevated theme-settings-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Abonelik & Ödeme Merkezi</p>
          <h3>Plan Seçimi ve Güvenli Ödeme</h3>
        </div>
        {activeTenant.status === 'Demo' && (
           <span className="mini-badge" style={{ background: 'var(--amber-muted)', color: 'var(--amber-strong)' }}>
             ⏱️ Demo Sürüm
           </span>
        )}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24, maxWidth: 800 }}>
        Aşağıdan firmanızın ihtiyaçlarına en uygun paketi seçin ve kredi kartınızla aboneliğinizi başlatın.
        Altyapımız <strong>256-bit SSL ve PCI-DSS standartları</strong> ile korunmaktadır.
      </p>

      {successMsg ? (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 24, borderRadius: 12, textAlign: 'center', color: '#059669', marginBottom: 20 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
          <h3 style={{ margin: 0, marginBottom: 8, fontSize: '1.2rem' }}>Tebrikler! Aboneliğiniz Başladı</h3>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>{successMsg}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          
          {/* LEFT COL: PACKAGE SELECTION */}
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, background: 'var(--bg-main)', padding: 6, borderRadius: 10, width: 'fit-content' }}>
              <button
                type="button"
                onClick={() => setBillingCycle('Aylık')}
                style={{
                  background: billingCycle === 'Aylık' ? 'var(--accent)' : 'transparent',
                  color: billingCycle === 'Aylık' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '8px 24px',
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Aylık Ödeme
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('Yıllık')}
                style={{
                  background: billingCycle === 'Yıllık' ? 'var(--accent)' : 'transparent',
                  color: billingCycle === 'Yıllık' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '8px 24px',
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                Yıllık Ödeme <span style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: 10 }}>%15 İndirimli</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {initialSaaSPackages.map(pkg => (
                <label 
                  key={pkg.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: 16, 
                    border: selectedPlanId === pkg.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: selectedPlanId === pkg.id ? 'var(--accent-soft)' : 'var(--bg-panel)',
                    padding: 20,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <input 
                    type="radio" 
                    name="package" 
                    checked={selectedPlanId === pkg.id} 
                    onChange={() => setSelectedPlanId(pkg.id)}
                    style={{ marginTop: 4, width: 20, height: 20, accentColor: 'var(--accent)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{pkg.name}</h4>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(billingCycle === 'Yıllık' ? pkg.annualFee : pkg.monthlyFee)}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          /{billingCycle === 'Yıllık' ? 'Yıl' : 'Ay'}
                        </span>
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pkg.description}</p>
                    <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>👤 {pkg.maxUsers} Kullanıcı</span>
                      {pkg.modulesEnabled.crm && <span>✅ CRM</span>}
                      {pkg.modulesEnabled.offers && <span>✅ Teklif</span>}
                      {pkg.modulesEnabled.contracts && <span>✅ Sözleşme</span>}
                      {pkg.modulesEnabled.documents && <span>✅ Doküman</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* RIGHT COL: PAYMENT FORM */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <h4 style={{ margin: '0 0 20px 0', fontSize: '1.05rem', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              Kredi Kartı ile Güvenli Ödeme
            </h4>
            
            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: 12, borderRadius: 8, fontSize: '0.85rem', marginBottom: 16 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>Kart Üzerindeki İsim</label>
                <input 
                  type="text" 
                  placeholder="AD SOYAD" 
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>Kart Numarası</label>
                <input 
                  type="text" 
                  placeholder="0000 0000 0000 0000" 
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    val = val.replace(/(.{4})/g, '$1 ').trim();
                    setCardNumber(val);
                  }}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>Son Kul. Tarihi</label>
                  <input 
                    type="text" 
                    placeholder="AA/YY"
                    maxLength={5}
                    value={expiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) {
                        val = val.substring(0, 2) + '/' + val.substring(2, 4);
                      }
                      setExpiry(val);
                    }}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>CVC/CVV</label>
                  <input 
                    type="text" 
                    placeholder="123" 
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-main)', padding: 16, borderRadius: 8, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ödenecek Tutar</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
                   {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount)}
                </strong>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing}
                style={{
                  width: '100%',
                  background: isProcessing ? 'var(--text-muted)' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: 16,
                  borderRadius: 10,
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {isProcessing ? 'Ödeme Alınıyor (3D Secure)...' : 'Güvenli Ödeme Yap & Başla'}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
              <span style={{ fontSize: '1.5rem', opacity: 0.6 }}>💳</span>
              <span style={{ fontSize: '1.5rem', opacity: 0.6 }}>🏦</span>
              <span style={{ fontSize: '1.5rem', opacity: 0.6 }}>🛡️</span>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-main)',
  color: 'var(--text-main)',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box' as const,
  fontFamily: 'inherit'
};
