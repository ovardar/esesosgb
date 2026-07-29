import { supabase } from './supabase';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const DEFAULT_FROM = import.meta.env.VITE_FROM_EMAIL || 'Codentra CRM <davet@codentra.com.tr>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  redirectTo?: string;
}

export async function sendEmail({ to, subject, html, from = DEFAULT_FROM }: SendEmailOptions) {
  const recipients = Array.isArray(to) ? to : [to];

  // 1. Primary: Try Supabase Edge Function (Bypasses Browser CORS restrictions)
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('send-email', {
      body: { to: recipients, subject, html, from }
    });

    if (!edgeErr && edgeData?.success) {
      console.log('[Email] Sent successfully via Supabase Edge Function:', edgeData);
      return { success: true, provider: 'resend-edge', data: edgeData };
    }

    if (edgeErr || (edgeData && !edgeData.success)) {
      console.warn('[Email] Edge function returned warning/error, attempting direct client fallback if key present:', edgeErr || edgeData);
    }
  } catch (fnErr) {
    console.warn('[Email] Supabase functions.invoke exception:', fnErr);
  }

  // 2. Secondary Direct Fallback: Try Resend REST API (Subject to browser CORS)
  if (RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: from,
          to: recipients,
          subject: subject,
          html: html
        })
      });

      const data = await response.json();
      if (response.ok) {
        return { success: true, provider: 'resend', data };
      }
      let lastError = data?.message || data?.error || JSON.stringify(data);

      if (from !== 'Codentra CRM <onboarding@resend.dev>') {
        const fallbackResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'Codentra CRM <onboarding@resend.dev>',
            to: recipients,
            subject: subject,
            html: html
          })
        });

        const fallbackData = await fallbackResp.json();
        if (fallbackResp.ok) {
          return { success: true, provider: 'resend-onboarding', data: fallbackData };
        }
        lastError = fallbackData?.message || fallbackData?.error || lastError;
      }

      return { success: false, error: lastError };
    } catch (err) {
      console.warn('[Email] Resend direct fetch failed:', err);
    }
  }

  return { success: false, error: 'Edge function not yet deployed or Resend CORS restriction active.' };
}




/**
 * Müşteriye Özel Davet E-Postası Şablonu
 */
export function buildCustomerInviteTemplate(companyName: string, inviteUrl: string) {
  return `
    <div style="font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 30px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">codentra</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Teklif ve Sözleşme Yazılımı (Codentra CRM)</p>
        </div>
        <div style="padding: 32px 30px;">
          <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">Sayın ${companyName} Yetkilisi,</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569;">
            Codentra Teklif ve Sözleşme Yazılımımız üzerinden teklif, sözleşme ve kurumsal evrak süreçlerinizi takip etmek üzere portalınıza davet edildiniz.
          </p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 16px; display: inline-block;">
              Sisteme Giriş Yapın & Şifrenizi Belirleyin
            </a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
            Bu e-posta otomatik olarak gönderilmiştir. Herhangi bir sorunuz için <a href="mailto:destek@codentra.com.tr" style="color: #4f46e5;">destek@codentra.com.tr</a> adresi üzerinden bizimle iletişime geçebilirsiniz.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #64748b;">
          &copy; 2026 Codentra. Tüm hakları saklıdır.
        </div>
      </div>
    </div>
  `;
}

