import type { SaaSTenant } from '../types';

export interface TenantPersonnelOption {
  name: string;
  role: string;
  userType?: string;
}

export function getTenantPersonnelList(activeTenant?: SaaSTenant | null): TenantPersonnelOption[] {
  const contactName = activeTenant?.contactName || 'Ahmet Dursun';
  const tenantId = activeTenant?.id || '3b3e7f5a-9d2c-4e8a-b1c4-9a8b7c6d5e4f';

  const list: TenantPersonnelOption[] = [
    { name: contactName, role: 'Firma Yöneticisi (Admin)', userType: '💻 Sistem Kullanıcısı' }
  ];

  try {
    const saved = localStorage.getItem('crm_tenant_users_map_v2');
    if (saved) {
      const map: Record<string, any[]> = JSON.parse(saved);
      // Look up by tenant ID or company name
      let tenantUsers: any[] = [];
      if (map[tenantId]) {
        tenantUsers = map[tenantId];
      } else {
        // Fallback search across all entries
        const keys = Object.keys(map);
        if (keys.length > 0) {
          tenantUsers = map[keys[0]] || [];
        }
      }

      tenantUsers.forEach((u) => {
        if (u.name && u.name.trim().toLowerCase() !== contactName.trim().toLowerCase()) {
          list.push({
            name: u.name,
            role: u.role || 'Personel',
            userType: u.userType || '💻 Sistem Kullanıcısı'
          });
        }
      });
    }
  } catch (e) {
    console.warn('[getTenantPersonnelList] Error reading saved users map:', e);
  }

  return list;
}

export function getTenantExperts(activeTenant?: SaaSTenant | null): TenantPersonnelOption[] {
  const all = getTenantPersonnelList(activeTenant);
  return all.filter(p => 
    p.role.includes('İSG Uzmanı (A Sınıfı)') || 
    p.role.includes('İSG Uzmanı (B Sınıfı)') || 
    p.role.includes('İSG Uzmanı (C Sınıfı)') ||
    p.role.includes('Firma Yöneticisi (Admin)') ||
    p.role.includes('Firma Yöneticisi (Tenant Admin)')
  );
}

export function getTenantDoctors(activeTenant?: SaaSTenant | null): TenantPersonnelOption[] {
  const all = getTenantPersonnelList(activeTenant);
  return all.filter(p => 
    p.role.includes('İşyeri Hekimi') || 
    p.role.includes('Firma Yöneticisi (Admin)') ||
    p.role.includes('Firma Yöneticisi (Tenant Admin)')
  );
}

export function getTenantDsps(activeTenant?: SaaSTenant | null): TenantPersonnelOption[] {
  const all = getTenantPersonnelList(activeTenant);
  return all.filter(p => 
    p.role.includes('Diğer Sağlık Personeli (DSP)') || 
    p.role.includes('Firma Yöneticisi (Admin)') ||
    p.role.includes('Firma Yöneticisi (Tenant Admin)')
  );
}
