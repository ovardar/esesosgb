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

export function SignupPage({ onSignupSuccess, onSwitchToLogin }: SignupPageProps) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignup = async (isDemo: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!companyName || !contactName || !phone || !cleanEmail || !password) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

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
      
      // Check if tenant already exists for this email
      if (currentTenants.some((t: SaaSTenant) => t.email === cleanEmail)) {
         // User already has a tenant, just let them in (or show error)
         // Continuing for smooth UX
      } else {
        const newTenant: SaaSTenant = {
          id: `t_${Date.now()}`,
          tenantCode: `CT-${Math.floor(1000 + Math.random() * 9000)}`,
          companyName,
          contactName,
          email: cleanEmail,
          phone,
          city: 'Belirtilmedi',
          package: 'Starter',
          status: isDemo ? 'Demo' : 'Aday',
          paymentStatus: 'Bekliyor',
          healthStatus: 'İyi',
          monthlyFee: 1500,
          maxUsers: 5,
          activeUsers: 1,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          autoRenew: true,
          trialEndsAt: isDemo ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          modulesEnabled: {
            crm: true,
            offers: true,
            contracts: true,
            documents: true,
            analytics: true,
          },
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          activationStatus: 'Hesap Aktif (Şifre Belirlendi)'
        };
        
        currentTenants.push(newTenant);
        await saveCloudTenants(currentTenants);
      }

      localStorage.setItem('crm_user_session', cleanEmail);
      onSignupSuccess(cleanEmail, isDemo);
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Kayıt olurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: 480,
        background: 'rgba(22, 36, 42, 0.92)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 22,
        padding: '30px 36px',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.65)'
      }}>
        {/* LOGO & HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
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

        {/* SIGNUP FORM */}
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <input
              type="text"
              placeholder="Firma Adı (Örn: Codentra Yazılım)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              type="text"
              placeholder="Yetkili Ad-Soyad"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="tel"
              placeholder="Telefon"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <input
              type="email"
              placeholder="E-Posta Adresi"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Şifre Belirleyin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
             <button
              type="button"
              disabled={loading}
              onClick={() => handleSignup(true)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                border: '1px solid #0ea5e9',
                background: 'rgba(14, 165, 233, 0.1)',
                color: '#38bdf8',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🚀 7 Gün Ücretsiz Deneme Başlat
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSignup(false)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              💳 Hemen Paket Seç & Satın Al
            </button>
          </div>
        </div>

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
