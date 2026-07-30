// native fetch
const SUPABASE_URL = 'https://dnvuizausfcjzkcsynql.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LtrytF9wyS3u-KgSZk7heg_SZc7hhoY';

const testOsgb3 = {
  id: '3b3e7f5a-9d2c-4e8a-b1c4-9a8b7c6d5e4f',
  name: 'Test OSGB 3',
  slug: 'test-osgb-3',
  tenant_code: 'TNT-OSGB3',
  contact_name: 'Ahmet Dursun',
  email: 'orhanvardarusa@gmail.com',
  phone: '0850 000 00 00',
  city: 'İstanbul',
  package: 'Enterprise',
  status: 'Aktif',
  payment_status: 'Sorunsuz',
  health_status: 'Mükemmel',
  monthly_fee: 28000,
  annual_fee: 336000,
  billing_cycle: 'Aylık',
  max_users: 50,
  active_users: 1,
  start_date: '2025-01-01',
  end_date: '2026-01-01',
  notes: 'Örnek not...',
  is_active: true,
  activation_status: 'Davet Gönderildi (Şifre Bekliyor)',
  logo_url: null,
  updated_at: new Date().toISOString()
};

async function restore() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(testOsgb3)
  });
  
  if (res.ok) {
    console.log('Restored successfully');
  } else {
    const error = await res.text();
    console.error('Failed to restore:', error);
  }
}

restore();
