export interface TenantUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  status: 'Aktif' | 'Pasif';
  userType: 'Sistem Kullanıcısı' | 'Saha / Danışman Kadro';
  addedAt: string;
}

const firstNames = [
  'Ahmet', 'Mehmet', 'Ali', 'Mustafa', 'Hüseyin', 'Hasan', 'İbrahim', 'İsmail', 'Osman', 'Murat',
  'Ömer', 'Yusuf', 'Emre', 'Oğuzhan', 'Burak', 'Caner', 'Deniz', 'Hakan', 'Erkan', 'Serkan',
  'Ayşe', 'Fatma', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Merve', 'Büşra', 'Selin', 'Ceren',
  'Gamze', 'Seda', 'Derya', 'Ebru', 'Gizem', 'Yasemin', 'Tuğba', 'Hande', 'Pınar', 'Kübra'
];

const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir',
  'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek',
  'Polat', 'Korkmaz', 'Tekin', 'Bulut', 'Şen', 'Yalçın', 'Güler', 'Bozkurt', 'Güneş', 'Kahraman'
];

const roles = [
  'Firma Yöneticisi (Tenant Admin)',
  'CRM & Satış Yöneticisi',
  'Teklif & Sözleşme Uzmanı',
  'Doküman & Arşiv Yöneticisi',
  'Finans & Muhasebe Sorumlusu',
  'İSG Uzmanı (A Sınıfı)',
  'İSG Uzmanı (B Sınıfı)',
  'İSG Uzmanı (C Sınıfı)',
  'İşyeri Hekimi',
  'Diğer Sağlık Personeli (DSP)',
  'Saha Operasyon Uzmanı',
  'Müşteri Temsilcisi'
];

// Helper to generate N realistic dummy users for a tenant
export function generateUsersForTenant(tenantId: string, companyDomain: string, targetCount: number): TenantUser[] {
  const users: TenantUser[] = [];
  const cleanDomain = companyDomain.replace('http://', '').replace('https://', '').replace('www.', '').split('/')[0];

  for (let i = 0; i < targetCount; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3 + 2) % lastNames.length];
    const role = roles[i % roles.length];
    
    // Turkish char replacement for email
    const cleanFn = fn.toLowerCase().replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
    const cleanLn = ln.toLowerCase().replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');

    const email = i === 0 ? `admin@${cleanDomain}` : `${cleanFn}.${cleanLn}@${cleanDomain}`;
    const day = String((i % 28) + 1).padStart(2, '0');
    const month = String((i % 12) + 1).padStart(2, '0');

    // System users vs Field / Information personnel
    const userType: 'Sistem Kullanıcısı' | 'Saha / Danışman Kadro' =
      role.includes('Admin') || role.includes('Yöneticisi') || role.includes('Temsilcisi') || role.includes('Uzmanı') && !role.includes('Saha')
        ? 'Sistem Kullanıcısı'
        : (i % 2 === 0 ? 'Sistem Kullanıcısı' : 'Saha / Danışman Kadro');

    users.push({
      id: `usr-${tenantId}-${i + 1}`,
      tenantId,
      name: `${fn} ${ln}`,
      email,
      role,
      phone: `053${Math.floor(2 + Math.random() * 7)} ${Math.floor(100 + Math.random() * 899)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)}`,
      status: 'Aktif',
      userType,
      addedAt: `2025-${month}-${day}`
    });
  }

  return users;
}


// Initial Seeded Tenant Users Store
export const initialTenantUsersMap: Record<string, TenantUser[]> = {
  'tenant-1': generateUsersForTenant('tenant-1', 'metropolosgb.com.tr', 12),
  'tenant-2': generateUsersForTenant('tenant-2', 'vipisg.com', 38), // VIP İş Sağlığı: Exactly 38 Users!
  'tenant-3': generateUsersForTenant('tenant-3', 'egerisk.com', 2),
  'tenant-4': generateUsersForTenant('tenant-4', 'dogumarmaraosgb.com', 14),
  'tenant-5': generateUsersForTenant('tenant-5', 'teknosaglik.com.tr', 1)
};
