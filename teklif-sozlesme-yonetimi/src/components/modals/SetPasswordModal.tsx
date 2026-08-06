import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchCloudTenants, saveCloudTenants } from '../../lib/cloudDb';

interface SetPasswordModalProps {
  inviteCode?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetPasswordModal({ inviteCode, isOpen, onClose, onSuccess }: SetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrorMsg('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const params = new URLSearchParams(window.location.search);
    const targetEmail = (params.get('email') || '').trim().toLowerCase();
    const tenantId = params.get('tenant') || '';

    try {
      // 1. Supabase Auth Registration / Update
      if (targetEmail) {
        // Attempt Sign Up first so user exists in Supabase Auth
        const { error: signUpError } = await supabase.auth.signUp({
          email: targetEmail,
          password: password,
          options: {
            data: {
              app_name: 'codentra'
            }
          }
        });

        if (signUpError) {
          console.warn('[SetPasswordModal] Auth signUp note:', signUpError.message);
          // If user already exists or signup requires session, try signIn or updateUser
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: password,
          });
          if (signInError) {
            await supabase.auth.updateUser({ password }).catch(() => {});
          }
        }

        // Store local session and password map as fail-safe backup
        try {
          const passMap = JSON.parse(localStorage.getItem('crm_user_passwords_map') || '{}');
          passMap[targetEmail] = password;
          localStorage.setItem('crm_user_passwords_map', JSON.stringify(passMap));
          localStorage.setItem('crm_user_session', targetEmail);
        } catch (e) {
          console.warn('[SetPasswordModal] localStorage backup warning:', e);
        }
      } else {
        // Fallback for logged in active session password update
        await supabase.auth.updateUser({ password }).catch(() => {});
      }

      // 2. Update Tenant Activation Status in Cloud DB
      try {
        const tenants = await fetchCloudTenants();
        let updated = false;
        const nextTenants = tenants.map((t) => {
          const isMatch = (tenantId && t.id === tenantId) || (targetEmail && t.email.toLowerCase() === targetEmail);
          if (isMatch) {
            updated = true;
            return {
              ...t,
              activationStatus: 'Hesap Aktif (Şifre Belirlendi)' as const,
              status: 'Aktif' as const,
              inviteAcceptedAt: new Date().toLocaleString('tr-TR')
            };
          }
          return t;
        });

        if (updated) {
          await saveCloudTenants(nextTenants);
        }
      } catch (dbErr) {
        console.warn('[SetPasswordModal] Tenant status update note:', dbErr);
      }

      setSuccessMsg('Şifreniz başarıyla belirlendi ve hesabınız aktif edildi!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Şifre belirlenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 36,
        color: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}>
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
          }}>
            🔑
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
            Şifre Belirleme & Aktivasyon
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.86rem', color: '#94a3b8' }}>
            Codentra Teklif ve Sözleşme Yazılımı hesabınız için güvenli şifrenizi oluşturun.
          </p>
          {inviteCode && (
            <div style={{
              display: 'inline-block',
              marginTop: 10,
              padding: '3px 12px',
              borderRadius: 20,
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              🎫 Davet Kodu: {inviteCode}
            </div>
          )}
        </div>

        {/* MESSAGES */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: '0.85rem',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: '0.85rem',
            marginBottom: 16,
            textAlign: 'center'
          }}>
            ✅ {successMsg}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Yeni Şifre
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: 2
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Şifre Tekrar
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Şifrenizi doğrulayın"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#ffffff',
                fontSize: '0.92rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '0.96rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Kaydediliyor...' : 'Şifremi Kaydet ve Giriş Yap →'}
          </button>
        </form>
      </div>
    </div>
  );
}
