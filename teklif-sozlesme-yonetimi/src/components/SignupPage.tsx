import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CODENTRA_LOGO_DATA_URI } from '../assets/logoDataUri';
import { SaaSTenant } from '../types';
import { initialSaaSTenants } from '../data/saasWorkbench';
import { fetchCloudTenants, saveCloudTenants } from '../lib/cloudDb';

interface SignupPageProps {
  onSignupSuccess: (email: string, isDemo: boolean) => void;
  onSwitchToLogin: () => void;
}

type SignupStep = 'choice' | 'demo' | 'purchase';

export function SignupPage({ onSignupSuccess, onSwitchToLogin }: SignupPageProps) {
  const [step, setStep] = useState<SignupStep>('choice');

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Purchase states
  const [billingCycle, setBillingCycle] = useState<'Aylık' | 'Yıllık'>('Yıllık');
  const [selectedPackage, setSelectedPackage] = useState<'Starter' | 'Pro' | 'Enterprise'>('Pro');
  const [ccName, setCcName] = useState('');
  const [ccNumber, setCcNumber] = useState('');
  const [ccExpiry, setCcExpiry] = useState('');
  const [ccCvv, setCcCvv] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const packages = [
    { name: 'Starter', mFee: 1450, aFee: 14500, users: 5 },
    { name: 'Pro', mFee: 2800, aFee: 28000, users: 20 },
    { name: 'Enterprise', mFee: 5500, aFee: 55000, users: 50 },
  ];

  const handleSignup = async (isDemo: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!companyName || !contactName || !phone || !cleanEmail || !password) {
      setErrorMsg('Lütfen tüm firma ve yetkili alanlarını doldurun.');
      return;
    }

    // Payment validation if purchase
    if (!isDemo) {
      if (!ccName || !ccNumber || !ccExpiry || !ccCvv) {
        setErrorMsg('Lütfen kredi kartı bilgilerini doldurun.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);

    // Mock Payment Logic
    let paymentSuccess = true;
    if (!isDemo && ccNumber.startsWith('0000')) {
      paymentSuccess = false;
    }

    try {
      // 1. Create User in Supabase Auth (or simulate if using mock)
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (error && !error.message.includes('User already registered')) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      // Save password to local map for fallback
      const passMap = JSON.parse(localStorage.getItem('crm_user_passwords_map') || '{}');
      passMap[cleanEmail] = password;
      localStorage.setItem('crm_user_passwords_map', JSON.stringify(passMap));

      // 2. Register Tenant in Cloud DB
      const currentTenants = await fetchCloudTenants(initialSaaSTenants);
      
      const pkg = packages.find(p => p.name === selectedPackage) || packages[1];
      const selectedMonthlyFee = billingCycle === 'Yıllık' ? Math.round(pkg.aFee / 12) : pkg.mFee;
      
      const startDate = new Date();
      const endDate = new Date();
      if (isDemo) {
        endDate.setDate(endDate.getDate() + 7);
      } else {
        if (billingCycle === 'Yıllık') endDate.setFullYear(endDate.getFullYear() + 1);
        else endDate.setMonth(endDate.getMonth() + 1);
      }

      // Check if tenant already exists for this email
      if (!currentTenants.some((t: SaaSTenant) => t.email === cleanEmail)) {
        const newTenant: SaaSTenant = {
          id: `t_${Date.now()}`,
          tenantCode: `CT-${Math.floor(1000 + Math.random() * 9000)}`,
          companyName,
          contactName,
          email: cleanEmail,
          phone,
          city: 'Belirtilmedi',
          package: isDemo ? 'Starter' : (selectedPackage as any),
          status: isDemo ? 'Demo' : (paymentSuccess ? 'Aktif' : 'Aday'),
          paymentStatus: paymentSuccess ? 'Sorunsuz' : 'Bekliyor',
          healthStatus: paymentSuccess ? 'İyi' : 'Riskli',
          billingCycle: isDemo ? 'Aylık' : billingCycle,
          monthlyFee: isDemo ? 1450 : selectedMonthlyFee,
          annualFee: isDemo ? 14500 : pkg.aFee,
          maxUsers: pkg.users,
          activeUsers: 1,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          autoRenew: true,
          trialEndsAt: isDemo ? endDate.toISOString() : undefined,
          modulesEnabled: {
            crm: true,
            offers: true,
            contracts: true,
            documents: true,
            analytics: true,
          },
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          activationStatus: paymentSuccess || isDemo ? 'Hesap Aktif (Şifre Belirlendi)' : 'Şifre Belirlendi (Ödeme Bekliyor)'
        };
        
        currentTenants.push(newTenant);
        await saveCloudTenants(currentTenants);
      }

      if (!isDemo && !paymentSuccess) {
         setErrorMsg('Ödeme başarısız oldu. Kaydınız aday olarak alındı ancak sisteme giriş yapamazsınız. Lütfen satış ekibimizle veya bankanızla iletişime geçin.');
         setLoading(false);
         return;
      }

      localStorage.setItem('crm_user_session', cleanEmail);
      onSignupSuccess(cleanEmail, isDemo);
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Kayıt olurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const renderChoiceScreen = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <button
        type="button"
        onClick={() => setStep('demo')}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          border: '1px solid #0ea5e9',
          background: 'rgba(14, 165, 233, 0.1)',
          color: '#38bdf8',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        🚀 7 Gün Ücretsiz Deneme Başlat
      </button>
      <button
        type="button"
        onClick={() => setStep('purchase')}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          border: 'none',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
          transition: 'all 0.2s ease',
        }}
      >
        💳 Paket Seç & Satın Al
      </button>
    </div>
  );

  const renderDemoForm = () => (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div>
        <input type="text" placeholder="Firma Adı (Örn: Codentra Yazılım)" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <input type="text" placeholder="Yetkili Ad-Soyad" value={contactName} onChange={e => setContactName(e.target.value)} style={inputStyle} />
        <input type="tel" placeholder="Telefon" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <input type="email" placeholder="E-Posta Adresi" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <input type="password" placeholder="Şifre Belirleyin" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSignup(true)}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            border: '1px solid #0ea5e9',
            background: 'rgba(14, 165, 233, 0.1)',
            color: '#38bdf8',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🚀 Deneme Başlat
        </button>
        <button
          type="button"
          onClick={() => setStep('choice')}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: 8,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer'
          }}
        >
          İptal & Geri Dön
        </button>
      </div>
    </div>
  );

  const renderPurchaseForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Packages */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 8 }}>
            <button
              onClick={() => setBillingCycle('Aylık')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: billingCycle === 'Aylık' ? '#10b981' : 'transparent',
                color: billingCycle === 'Aylık' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Aylık
            </button>
            <button
              onClick={() => setBillingCycle('Yıllık')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: billingCycle === 'Yıllık' ? '#10b981' : 'transparent',
                color: billingCycle === 'Yıllık' ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Yıllık (%20 İndirim)
            </button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {packages.map(pkg => (
            <div
              key={pkg.name}
              onClick={() => setSelectedPackage(pkg.name as any)}
              style={{
                padding: 16,
                borderRadius: 12,
                border: `1px solid ${selectedPackage === pkg.name ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                background: selectedPackage === pkg.name ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: 600, color: selectedPackage === pkg.name ? '#10b981' : '#fff' }}>{pkg.name}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '8px 0' }}>
                ₺{(billingCycle === 'Yıllık' ? Math.round(pkg.aFee / 12) : pkg.mFee).toLocaleString('tr-TR')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ ay</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }}></div>

      {/* Forms Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* User Info */}
        <div style={{ display: 'grid', gap: 12 }}>
          <h4 style={{ color: '#e2e8f0', margin: 0 }}>Firma & Kullanıcı</h4>
          <input type="text" placeholder="Firma Adı" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} />
          <input type="text" placeholder="Yetkili Ad-Soyad" value={contactName} onChange={e => setContactName(e.target.value)} style={inputStyle} />
          <input type="tel" placeholder="Telefon" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
          <input type="email" placeholder="E-Posta" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        </div>

        {/* Credit Card Info */}
        <div style={{ display: 'grid', gap: 12 }}>
          <h4 style={{ color: '#e2e8f0', margin: 0 }}>Ödeme Bilgileri</h4>
          <input type="text" placeholder="Kart Üzerindeki İsim" value={ccName} onChange={e => setCcName(e.target.value)} style={inputStyle} />
          <input type="text" placeholder="Kart Numarası (0000 ile başlarsa reddedilir)" value={ccNumber} onChange={e => setCcNumber(e.target.value)} style={inputStyle} maxLength={19} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input type="text" placeholder="AA/YY" value={ccExpiry} onChange={e => setCcExpiry(e.target.value)} style={inputStyle} maxLength={5} />
            <input type="text" placeholder="CVV" value={ccCvv} onChange={e => setCcCvv(e.target.value)} style={inputStyle} maxLength={4} />
          </div>
          
          <div style={{ marginTop: 'auto' }}>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSignup(false)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              💳 Ödemeyi Tamamla
            </button>
            <button
              type="button"
              onClick={() => setStep('choice')}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: 8,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              İptal & Geri Dön
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1c2e36 0%, #16242a 60%, #0e171b 100%)',
      color: '#f8fafc',
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: step === 'purchase' ? 840 : 480,
        background: 'rgba(22, 36, 42, 0.92)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 22,
        padding: step === 'purchase' ? '40px 48px' : '30px 36px',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.65)',
        transition: 'all 0.3s ease'
      }}>
        {/* LOGO & HEADER */}
        <div style={{ textAlign: 'center', marginBottom: step === 'purchase' ? 32 : 24 }}>
          <img
            src={CODENTRA_LOGO_DATA_URI}
            alt="Codentra Logo"
            style={{
              height: 80,
              maxWidth: '100%',
              objectFit: 'contain',
              marginBottom: 10,
              filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.45))'
            }}
          />
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500, letterSpacing: '0.02em' }}>
            Yeni Hesap Oluştur
          </p>
        </div>

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            padding: '10px',
            borderRadius: 8,
            fontSize: '0.85rem',
            marginBottom: 20,
            textAlign: 'center'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* CONTENT */}
        {step === 'choice' && renderChoiceScreen()}
        {step === 'demo' && renderDemoForm()}
        {step === 'purchase' && renderPurchaseForm()}

        {step === 'choice' && (
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.85rem' }}>
            <span style={{ color: '#94a3b8' }}>Zaten hesabınız var mı? </span>
            <button 
              onClick={onSwitchToLogin}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#38bdf8', 
                fontWeight: 600, 
                cursor: 'pointer',
                padding: 0
              }}
            >
              Giriş Yapın
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.15)',
  background: 'rgba(14, 24, 28, 0.85)',
  color: '#ffffff',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box' as const
};
