import { supabase } from './supabase';

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
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('send-email', {
      body: { to: recipients, subject, html, from },
      headers
    });

    if (!edgeErr && edgeData?.success) {
      console.log('[Email] Sent successfully via Supabase Edge Function:', edgeData);
      return { success: true, provider: 'resend-edge', data: edgeData };
    }

    if (edgeErr || (edgeData && !edgeData.success)) {
      console.error('[Email] Edge function failed to send email:', edgeErr || edgeData);
      return { success: false, error: 'E-posta sunucusu geçici olarak yanıt vermiyor (Edge Function Hatası).' };
    }
  } catch (fnErr) {
    console.error('[Email] Supabase functions.invoke exception:', fnErr);
    return { success: false, error: 'E-posta servisi bağlantı hatası.' };
  }

  return { success: false, error: 'Bilinmeyen bir hata oluştu.' };
}




/**
 * Müşteriye Özel Davet E-Postası Şablonu
 */
export function buildCustomerInviteTemplate(bodyHtml: string) {
  return `
    <div style="font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #111827; padding: 30px; text-align: center; color: #ffffff; border-bottom: 4px solid #059669;">
          <img src="https://app.codentra.com.tr/codentra-logo.png" alt="Codentra" style="height: 40px; margin-bottom: 12px;" />
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; color: #f6f3ee;">Teklif ve Sözleşme Yazılımı (Codentra CRM)</p>
        </div>
        <div style="padding: 32px 30px;">
          <div style="font-size: 15px; line-height: 1.6; color: #475569; white-space: pre-wrap;">
            ${bodyHtml}
          </div>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            Bu e-posta otomatik olarak gönderilmiştir. Herhangi bir sorunuz için <a href="mailto:destek@codentra.com.tr" style="color: #059669; font-weight: 600;">destek@codentra.com.tr</a> adresi üzerinden bizimle iletişime geçebilirsiniz.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 12px; color: #64748b;">
          &copy; 2026 Codentra. Tüm hakları saklıdır.
        </div>
      </div>
    </div>
  `;
}

