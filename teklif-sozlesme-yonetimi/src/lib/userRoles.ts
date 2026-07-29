// User Role & Badge Resolution Helper
// Resolves user name, company role, and display badge based on tenant data and user permissions.

import type { SaaSTenant } from '../types';
import type { TenantUser } from '../data/tenantUsers';

export interface UserRoleInfo {
  name: string;
  companyName?: string;
  roleName: string;
  badgeLabel: string;
  badgeColor: string;
  badgeBg: string;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
}

export function resolveUserRoleInfo(
  currentUserEmail?: string,
  isSuperAdmin: boolean = false,
  activeTenant?: SaaSTenant | null
): UserRoleInfo {
  const cleanEmail = (currentUserEmail || localStorage.getItem('crm_user_session') || '').trim().toLowerCase();

  // 1. Superadmin User Check (when NOT in tenant mode)
  if (!activeTenant && isSuperAdmin && cleanEmail !== 'orhanvardarusa@gmail.com') {
    return {
      name: 'Orhan Vardar',
      roleName: 'Sistem Yöneticisi (Süper Admin)',
      badgeLabel: '🛡️ Süper Admin',
      badgeColor: '#ffffff',
      badgeBg: '#6366f1',
      isSuperAdmin: true,
      isTenantAdmin: true
    };
  }

  // 2. Active Tenant (Impersonation Mode or Active Tenant Session)
  if (activeTenant) {
    return {
      name: activeTenant.contactName || activeTenant.companyName,
      companyName: activeTenant.companyName,
      roleName: 'Firma Yöneticisi (Admin)',
      badgeLabel: `👑 ${activeTenant.contactName || activeTenant.companyName}`,
      badgeColor: '#ffffff',
      badgeBg: '#059669',
      isSuperAdmin: false,
      isTenantAdmin: true
    };
  }

  // 3. Search in Tenant Users Map (users added in Kullanıcı İzinleri)
  try {
    const savedUsersMapStr = localStorage.getItem('crm_tenant_users_map_v2');
    if (savedUsersMapStr) {
      const usersMap: Record<string, TenantUser[]> = JSON.parse(savedUsersMapStr);
      for (const tenantId in usersMap) {
        const userList = usersMap[tenantId] || [];
        const foundUser = userList.find((u) => u.email.trim().toLowerCase() === cleanEmail);
        if (foundUser) {
          const isAdminRole = foundUser.role.toLowerCase().includes('admin') || foundUser.role.toLowerCase().includes('yönetici');
          return {
            name: foundUser.name,
            roleName: foundUser.role,
            badgeLabel: isAdminRole ? `👑 ${foundUser.name}` : `💼 ${foundUser.name}`,
            badgeColor: '#ffffff',
            badgeBg: isAdminRole ? '#059669' : '#0284c7',
            isSuperAdmin: false,
            isTenantAdmin: isAdminRole
          };
        }
      }
    }
  } catch (e) {
    console.warn('[userRoles] Error reading tenant users map:', e);
  }

  // 4. Search in SaaS Tenants List by email, contactName, or company fallback
  try {
    const savedTenantsStr = localStorage.getItem('crm_saas_tenants_v3');
    if (savedTenantsStr) {
      const tenants: SaaSTenant[] = JSON.parse(savedTenantsStr);
      if (tenants.length > 0) {
        const matchedTenant =
          tenants.find((t) => t.email && t.email.trim().toLowerCase() === cleanEmail) ||
          tenants.find((t) => t.contactName && t.contactName.trim().toLowerCase() === cleanEmail) ||
          tenants.find((t) => t.companyName && t.companyName.toLowerCase().includes('test osgb')) ||
          tenants[0];

        if (matchedTenant) {
          return {
            name: matchedTenant.contactName || matchedTenant.companyName,
            companyName: matchedTenant.companyName,
            roleName: 'Firma Yöneticisi (Admin)',
            badgeLabel: `👑 ${matchedTenant.contactName || matchedTenant.companyName}`,
            badgeColor: '#ffffff',
            badgeBg: '#059669',
            isSuperAdmin: false,
            isTenantAdmin: true
          };
        }
      }
    }
  } catch (e) {
    console.warn('[userRoles] Error reading SaaS tenants:', e);
  }

  // 5. Fallback formatting from email address
  const prefix = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
  const formattedName = prefix
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    name: formattedName || 'Firma Yetkilisi',
    roleName: 'Firma Yöneticisi (Admin)',
    badgeLabel: '👑 Firma Yöneticisi (Admin)',
    badgeColor: '#ffffff',
    badgeBg: '#059669',
    isSuperAdmin: false,
    isTenantAdmin: true
  };
}
