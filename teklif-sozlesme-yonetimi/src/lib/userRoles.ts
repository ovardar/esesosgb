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
  impersonatedTenant?: SaaSTenant | null
): UserRoleInfo {
  // 1. Impersonation Mode (Superadmin inspecting a tenant)
  if (impersonatedTenant) {
    return {
      name: impersonatedTenant.contactName || impersonatedTenant.companyName,
      companyName: impersonatedTenant.companyName,
      roleName: 'Kiracı İnceleme Modu',
      badgeLabel: `🏢 ${impersonatedTenant.companyName}`,
      badgeColor: '#d97706',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      isSuperAdmin: false,
      isTenantAdmin: true
    };
  }

  const cleanEmail = (currentUserEmail || localStorage.getItem('crm_user_session') || '').trim().toLowerCase();

  // 2. Superadmin User Check
  if (isSuperAdmin || !cleanEmail || cleanEmail === 'orhan.vardar@gmail.com') {
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
            badgeLabel: isAdminRole ? `👑 ${foundUser.role}` : `💼 ${foundUser.role}`,
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

  // 4. Search in SaaS Tenants List (Primary Contact / Founder created by Superadmin)
  try {
    const savedTenantsStr = localStorage.getItem('crm_saas_tenants_v3');
    if (savedTenantsStr) {
      const tenants: SaaSTenant[] = JSON.parse(savedTenantsStr);
      const matchedTenant = tenants.find((t) => t.email.trim().toLowerCase() === cleanEmail);
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
