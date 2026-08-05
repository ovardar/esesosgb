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

  // 2. Search in Tenant Users Map (users added in Kullanıcı İzinleri)
  try {
    const savedUsersMapStr = localStorage.getItem('crm_tenant_users_map_v2');
    if (savedUsersMapStr) {
      const usersMap: Record<string, TenantUser[]> = JSON.parse(savedUsersMapStr);
      const searchTargetIds = activeTenant ? [activeTenant.id, activeTenant.tenantCode] : Object.keys(usersMap);
      for (const tenantId of searchTargetIds) {
        if (!tenantId) continue;
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

  // 3. Active Tenant (Impersonation Mode or Active Tenant Session)
  if (activeTenant) {
    return {
      name: activeTenant.contactName || activeTenant.companyName,
      companyName: activeTenant.companyName,
      roleName: 'Firma Yöneticisi (Admin)',
      badgeLabel: '👑 Firma Yöneticisi (Admin)',
      badgeColor: '#ffffff',
      badgeBg: '#059669',
      isSuperAdmin: false,
      isTenantAdmin: true
    };
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
            badgeLabel: '👑 Firma Yöneticisi (Admin)',
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

export function isAuthorizedUser(emailToCheck: string): boolean {
  const cleanE = emailToCheck.trim().toLowerCase();
  if (cleanE === 'orhan.vardar@gmail.com') return true;

  try {
    const superadmins = JSON.parse(localStorage.getItem('crm_superadmins_v2') || '[]');
    if (superadmins.some((sa: any) => sa.email.toLowerCase() === cleanE)) return true;
  } catch (e) {}

  let allTenants: any[] = [];
  try {
    allTenants = JSON.parse(localStorage.getItem('crm_saas_tenants_v3') || '[]');
    if (allTenants.some((t: any) => t.email && t.email.toLowerCase() === cleanE && (t.status === 'Aktif' || t.status === 'Demo'))) return true;
  } catch (e) {}

  try {
    const usersMap = JSON.parse(localStorage.getItem('crm_tenant_users_map_v2') || '{}');
    for (const tenantId in usersMap) {
      const users = usersMap[tenantId];
      if (Array.isArray(users) && users.some((u: any) => u.email && u.email.toLowerCase() === cleanE && u.status === 'Aktif')) {
        const parentTenant = allTenants.find((t: any) => t.id === tenantId || t.tenantCode === tenantId);
        if (parentTenant && (parentTenant.status === 'Aktif' || parentTenant.status === 'Demo')) {
          return true;
        }
      }
    }
  } catch (e) {}
  
  return false;
}
