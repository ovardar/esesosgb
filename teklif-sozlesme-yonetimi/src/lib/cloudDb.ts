import { supabase } from './supabase';
import type { OfferRecord, ContractRecord, SaaSTenant, PriceRule, SaaSEmailTemplate, SuperAdminUser } from '../types';
import type { CustomerRecord } from '../components/pages/CustomersPage';
import type { TenantUser } from '../data/tenantUsers';

// Helper to safely parse JSON from localStorage
function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

// Helper to safely write to localStorage without quota crashes
function setLocalItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[localStorage] Write warning for key ${key}:`, e);
  }
}

// ==========================================
// 1. CUSTOMERS CLOUD SYNC
// ==========================================
export async function fetchCloudCustomers(fallback: CustomerRecord[] = []): Promise<CustomerRecord[]> {
  try {
    const { data, error } = await supabase.from('customers').select('*');
    if (!error && data && data.length > 0) {
      const customers: CustomerRecord[] = data.map((row: any) => ({
        id: row.id,
        name: row.name || row.company_name || row.companyName || 'Müşteri',
        status: row.status || 'Aktif',
        stage: row.stage || 'Müşteri',
        owner: row.owner || 'Orhan Vardar',
        city: row.city || 'İstanbul',
        district: row.district || '',
        hazardClass: row.hazard_class || row.hazardClass || 'Az Tehlikeli',
        sector: row.sector || 'Hizmet',
        employeeCount: row.employee_count || row.employeeCount || 1,
        contact: row.contact || row.contact_name || '',
        phone: row.phone || '',
        email: row.email || '',
        note: row.note || row.notes || '',
        taxNo: row.tax_no || row.taxNo || row.tax_number || '',
        taxOffice: row.tax_office || row.taxOffice || '',
        naceCode: row.nace_code || row.naceCode || '',
        address: row.address || '',
        contactsList: row.contactsList || row.contacts || [],
        activitiesList: row.activitiesList || row.activities || [],
        offers: row.offers || [],
        contracts: row.contracts || []
      }));
      setLocalItem('crm_customers_v2', customers);
      return customers;
    }
  } catch (err) {
    console.warn('[CloudDB] Customers fetch falling back to local storage', err);
  }
  return getLocalItem('crm_customers_v2', fallback);
}

export async function saveCloudCustomers(customers: CustomerRecord[]): Promise<void> {
  setLocalItem('crm_customers_v2', customers);
  try {
    const payload = customers.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      stage: c.stage,
      owner: c.owner,
      city: c.city,
      district: c.district,
      hazard_class: c.hazardClass,
      sector: c.sector,
      employee_count: c.employeeCount,
      contact: c.contact,
      phone: c.phone,
      email: c.email,
      note: c.note,
      tax_no: c.taxNo,
      tax_office: c.taxOffice,
      nace_code: c.naceCode,
      address: c.address,
      contacts_list: c.contactsList,
      activities_list: c.activitiesList,
      offers: c.offers,
      contracts: c.contracts,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('customers').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[CloudDB] Customer cloud upsert warning', err);
  }
}

// ==========================================
// 2. OFFERS CLOUD SYNC
// ==========================================
export async function fetchCloudOffers(fallback: OfferRecord[] = []): Promise<OfferRecord[]> {
  try {
    const { data, error } = await supabase.from('offers').select('*');
    if (!error && data && data.length > 0) {
      const offers: OfferRecord[] = data.map((row: any) => ({
        id: row.id,
        offerNo: row.offer_no || row.offerNo || 'TKL-2026-001',
        customerName: row.customer_name || row.customerName,
        subject: row.subject || 'İSG Hizmet Teklifi',
        status: row.status || 'Taslak',
        currentRevisionNo: row.current_revision_no || row.currentRevisionNo || 1,
        createdDate: row.created_date || row.createdDate || new Date().toISOString().split('T')[0],
        validUntilDate: row.valid_until_date || row.validUntilDate || new Date().toISOString().split('T')[0],
        owner: row.owner || 'Orhan Vardar',
        vatMode: row.vat_mode || row.vatMode || 'KDV Hariç',
        revisions: row.revisions || []
      }));
      setLocalItem('crm_offers_v3', offers);
      return offers;
    }
  } catch (err) {
    console.warn('[CloudDB] Offers fetch falling back to local storage', err);
  }
  return getLocalItem('crm_offers_v3', fallback);
}

export async function saveCloudOffers(offers: OfferRecord[]): Promise<void> {
  setLocalItem('crm_offers_v3', offers);
  try {
    const payload = offers.map(o => ({
      id: o.id,
      offer_no: o.offerNo,
      customer_name: o.customerName,
      subject: o.subject,
      status: o.status,
      current_revision_no: o.currentRevisionNo,
      created_date: o.createdDate,
      valid_until_date: o.validUntilDate,
      owner: o.owner,
      vat_mode: o.vatMode,
      revisions: o.revisions,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('offers').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[CloudDB] Offers cloud upsert warning', err);
  }
}

// ==========================================
// 3. CONTRACTS CLOUD SYNC
// ==========================================
export async function fetchCloudContracts(fallback: ContractRecord[] = []): Promise<ContractRecord[]> {
  try {
    const { data, error } = await supabase.from('contracts').select('*');
    if (!error && data && data.length > 0) {
      const contracts: ContractRecord[] = data.map((row: any) => ({
        id: row.id,
        contractNo: row.contract_no || row.contractNo || 'SZL-2026-001',
        contractTitle: row.contract_title || row.contractTitle || 'İSG Hizmet Sözleşmesi',
        customerName: row.customer_name || row.customerName,
        stage: row.stage || row.status || 'Aktif',
        offerId: row.offer_id || row.offerId,
        offerNo: row.offer_no || row.offerNo,
        acceptanceChannel: row.acceptance_channel || row.acceptanceChannel,
        acceptanceNotes: row.acceptance_notes || row.acceptanceNotes,
        startDate: row.start_date || row.startDate || new Date().toISOString().split('T')[0],
        endDate: row.end_date || row.endDate || new Date().toISOString().split('T')[0],
        currentRevisionNo: row.current_revision_no || row.currentRevisionNo || 1,
        createdDate: row.created_date || row.createdDate || new Date().toISOString().split('T')[0],
        owner: row.owner || 'Orhan Vardar',
        vatMode: row.vat_mode || row.vatMode || 'KDV Hariç',
        assignedExpert: row.assigned_expert || row.assignedExpert,
        assignedDoctor: row.assigned_doctor || row.assignedDoctor,
        assignedDsp: row.assigned_dsp || row.assignedDsp,
        isgKatipNo: row.isg_katip_no || row.isgKatipNo,
        paymentMethod: row.payment_method || row.paymentMethod || 'Banka Havalesi / EFT',
        paymentTerms: row.payment_terms || row.paymentTerms || 'Aylık Düzenli Fatura',
        billingCycle: row.billing_cycle || row.billingCycle || 'Aylık',
        autoRenew: row.auto_renew ?? row.autoRenew ?? true,
        revisions: row.revisions || [],
        notes: row.notes || ''
      }));
      setLocalItem('crm_contracts_v3', contracts);
      return contracts;
    }
  } catch (err) {
    console.warn('[CloudDB] Contracts fetch falling back to local storage', err);
  }
  return getLocalItem('crm_contracts_v3', fallback);
}

export async function saveCloudContracts(contracts: ContractRecord[]): Promise<void> {
  setLocalItem('crm_contracts_v3', contracts);
  try {
    const payload = contracts.map(c => ({
      id: c.id,
      contract_no: c.contractNo,
      contract_title: c.contractTitle,
      customer_name: c.customerName,
      stage: c.stage,
      offer_id: c.offerId,
      offer_no: c.offerNo,
      acceptance_channel: c.acceptanceChannel,
      acceptance_notes: c.acceptanceNotes,
      start_date: c.startDate,
      end_date: c.endDate,
      current_revision_no: c.currentRevisionNo,
      created_date: c.createdDate,
      owner: c.owner,
      vat_mode: c.vatMode,
      assigned_expert: c.assignedExpert,
      assigned_doctor: c.assignedDoctor,
      assigned_dsp: c.assignedDsp,
      isg_katip_no: c.isgKatipNo,
      payment_method: c.paymentMethod,
      payment_terms: c.paymentTerms,
      billing_cycle: c.billingCycle,
      auto_renew: c.autoRenew,
      revisions: c.revisions,
      notes: c.notes,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('contracts').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[CloudDB] Contracts cloud upsert warning', err);
  }
}

// ==========================================
// 4. TENANTS CLOUD SYNC
// ==========================================
export async function fetchCloudTenants(fallback: SaaSTenant[] = []): Promise<SaaSTenant[]> {
  const localList: SaaSTenant[] = getLocalItem('crm_saas_tenants_v3', fallback);
  const localMap = new Map<string, SaaSTenant>(localList.map(t => [t.id, t]));

  try {
    const { data, error } = await supabase.from('tenants').select('*');
    if (!error && data && data.length > 0) {
      const isDummyTenant = (name: string) => {
        if (!name) return false;
        const clean = name.toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').trim();
        if (clean.includes('test osgb 3')) return false;
        const keywords = ['girisim', 'mavi liman', 'soyyilmaz', 'oddn'];
        if (clean === 'test osgb') return true;
        return keywords.some(kw => clean.includes(kw));
      };

      const tenants: SaaSTenant[] = data
        .filter((row: any) => {
          const name = row.name || row.companyName;
          return name && !isDummyTenant(name);
        })
        .map((row: any) => {
          const existingLocal = localMap.get(row.id);
          return {
            id: row.id,
            tenantCode: row.tenant_code || existingLocal?.tenantCode || `TNT-${row.id.substring(0, 4).toUpperCase()}`,
            companyName: row.name || row.companyName || existingLocal?.companyName || 'Test OSGB 3',
            contactName: row.contact_name || row.contactName || existingLocal?.contactName || 'Orhan Vardar',
            email: row.email || row.contact_email || existingLocal?.email || 'orhan.vardar@gmail.com',
            phone: row.phone || existingLocal?.phone || '0850 000 00 00',
            city: row.city || existingLocal?.city || 'İstanbul',
            package: row.package || existingLocal?.package || 'Enterprise',
            status: row.status || existingLocal?.status || (row.is_active ? 'Aktif' : 'Pasif'),
            paymentStatus: row.payment_status || existingLocal?.paymentStatus || 'Sorunsuz',
            healthStatus: row.health_status || existingLocal?.healthStatus || 'Mükemmel',
            billingCycle: row.billing_cycle || existingLocal?.billingCycle || 'Yıllık',
            monthlyFee: row.monthly_fee ?? existingLocal?.monthlyFee ?? 28000,
            annualFee: row.annual_fee ?? existingLocal?.annualFee ?? 336000,
            maxUsers: row.max_users ?? existingLocal?.maxUsers ?? 50,
            activeUsers: row.active_users ?? existingLocal?.activeUsers ?? 1,
            startDate: row.start_date || existingLocal?.startDate || '2026-01-01',
            endDate: row.end_date || existingLocal?.endDate || '2027-01-01',
            autoRenew: row.auto_renew ?? existingLocal?.autoRenew ?? true,
            notes: row.notes || existingLocal?.notes || 'Supabase Bulut Veritabanı',
            modulesEnabled: row.modules_enabled || existingLocal?.modulesEnabled || { crm: true, offers: true, contracts: true, documents: true, analytics: true },
            lastLoginAt: existingLocal?.lastLoginAt || 'Bugün',
            createdBy: existingLocal?.createdBy || 'orhan.vardar@gmail.com',
            createdAt: row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : (existingLocal?.createdAt || new Date().toLocaleString('tr-TR')),
            updatedBy: existingLocal?.updatedBy || 'orhan.vardar@gmail.com',
            updatedAt: existingLocal?.updatedAt || new Date().toLocaleString('tr-TR'),
            activationStatus: row.activation_status || row.activationStatus || existingLocal?.activationStatus || 'Davet Gönderildi (Şifre Bekliyor)',
            logoUrl: row.logo_url || row.logoUrl || existingLocal?.logoUrl || undefined
          };
        });

      // Include local tenants not yet present in database
      const dbIds = new Set(tenants.map(t => t.id));
      localList.forEach(lt => {
        if (!dbIds.has(lt.id)) {
          tenants.push(lt);
        }
      });

      const cleanList = tenants.length > 0 ? tenants : fallback;
      setLocalItem('crm_saas_tenants_v3', cleanList);
      return cleanList;
    }
  } catch (err) {
    console.warn('[CloudDB] Tenants fetch falling back to local storage', err);
  }
  return localList;
}

const tenantSyncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('crm_saas_tenant_sync') : null;

export async function saveCloudTenants(tenants: SaaSTenant[]): Promise<void> {
  setLocalItem('crm_saas_tenants_v3', tenants);
  if (tenantSyncChannel) {
    try {
      tenantSyncChannel.postMessage({ type: 'TENANTS_UPDATED', tenants });
    } catch (e) {
      console.warn(e);
    }
  }
  try {
    const payload = tenants
      .filter(t => Boolean(t.id))
      .map(t => ({
        id: ensureUuid(t.id),
        name: t.companyName,
        slug: t.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        tenant_code: t.tenantCode,
        contact_name: t.contactName,
        email: t.email,
        phone: t.phone,
        city: t.city,
        package: t.package,
        status: t.status,
        is_active: t.status === 'Aktif',
        payment_status: t.paymentStatus,
        health_status: t.healthStatus,
        billing_cycle: t.billingCycle,
        monthly_fee: t.monthlyFee,
        annual_fee: t.annualFee,
        max_users: t.maxUsers,
        active_users: t.activeUsers,
        activation_status: t.activationStatus || 'Hesap Aktif (Şifre Belirlendi)',
        modules_enabled: t.modulesEnabled,
        logo_url: t.logoUrl || null,
        notes: t.notes || null,
        updated_at: new Date().toISOString()
      }));
    const uniquePayload = Array.from(new Map(payload.map(item => [item.id, item])).values());
    if (uniquePayload.length > 0) {
      const { error } = await supabase.from('tenants').upsert(uniquePayload, { onConflict: 'id' });
      if (error) {
        console.warn('[CloudDB] Tenants cloud upsert warning:', error);
        alert('Dikkat: Kiracı bilgileri veritabanına kaydedilirken hata oluştu. Supabase Hatası: ' + error.message);
      }
    }
  } catch (err) {
    console.warn('[CloudDB] Tenants cloud upsert warning', err);
  }
}


const ensureUuid = (id: string) => {
  if (!id) return id;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
  if (id === 'tenant-test-osgb3' || id === 'tnt-test-osgb-3') return '3b3e7f5a-9d2c-4e8a-b1c4-9a8b7c6d5e4f';
  const nums = id.replace(/[^0-9a-f]/ig, '').padEnd(12, '0').substring(0, 12);
  return `3b3e7f5a-9d2c-4e8a-b1c4-${nums.toLowerCase()}`;
};

export async function deleteCloudTenant(tenantId: string): Promise<void> {
  const safeId = ensureUuid(tenantId);
  if (safeId) {
    const { error } = await supabase.from('tenants').delete().eq('id', safeId);
    if (error) {
      console.error('[CloudDB] Tenant delete error', error);
      throw new Error(error.message || 'Veritabanından silinirken hata oluştu.');
    }
  }
}


// ==========================================
// 5. TENANT USERS CLOUD SYNC
// ==========================================
export async function fetchCloudTenantUsersMap(fallback: Record<string, TenantUser[]> = {}): Promise<Record<string, TenantUser[]>> {
  try {
    const { data, error } = await supabase.from('tenant_users').select('*');
    if (!error && data && data.length > 0) {
      const map: Record<string, TenantUser[]> = {};
      data.forEach((row: any) => {
        const tId = row.tenant_id || row.tenantId;
        if (!map[tId]) map[tId] = [];
        map[tId].push({
          id: row.id,
          tenantId: tId,
          name: row.name,
          email: row.email,
          role: row.role,
          phone: row.phone || '',
          status: row.status || 'Aktif',
          userType: row.user_type || 'Sistem Kullanıcısı',
          addedAt: row.added_at || new Date().toISOString()
        });
      });
      setLocalItem('crm_tenant_users_map_v2', map);
      return map;
    }
  } catch (err) {
    console.warn('[CloudDB] Tenant users fetch falling back to local storage', err);
  }
  return getLocalItem('crm_tenant_users_map_v2', fallback);
}

export async function saveCloudTenantUsersMap(map: Record<string, TenantUser[]>): Promise<void> {
  setLocalItem('crm_tenant_users_map_v2', map);
  try {
    const allUsers: any[] = [];
    Object.entries(map).forEach(([tenantId, users]) => {
      users.forEach(u => {
        allUsers.push({
          id: u.id,
          tenant_id: tenantId,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone,
          status: u.status,
          user_type: u.userType,
          added_at: u.addedAt
        });
      });
    });
    if (allUsers.length > 0) {
      await supabase.from('tenant_users').upsert(allUsers, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('[CloudDB] Tenant users cloud upsert warning', err);
  }
}

// ==========================================
// 6. PRICE RULES CLOUD SYNC
// ==========================================
export async function fetchCloudPriceRules(fallback: PriceRule[] = []): Promise<PriceRule[]> {
  try {
    const { data, error } = await supabase.from('price_rules').select('*');
    if (!error && data && data.length > 0) {
      const rules: PriceRule[] = data.map((row: any) => ({
        id: row.id,
        danger_class: row.danger_class || row.dangerClass,
        min_emp: row.min_emp ?? row.minEmp ?? 1,
        max_emp: row.max_emp ?? row.maxEmp ?? null,
        service_name: row.service_name || row.serviceName,
        price: row.price || 0
      }));
      setLocalItem('crm_price_rules_v2', rules);
      return rules;
    }
  } catch (err) {
    console.warn('[CloudDB] Price rules fetch falling back to local storage', err);
  }
  return getLocalItem('crm_price_rules_v2', fallback);
}

export async function saveCloudPriceRules(rules: PriceRule[]): Promise<void> {
  setLocalItem('crm_price_rules_v2', rules);
  try {
    const payload = rules.map(r => ({
      id: r.id,
      danger_class: r.danger_class,
      min_emp: r.min_emp,
      max_emp: r.max_emp,
      service_name: r.service_name,
      price: r.price,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('price_rules').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[CloudDB] Price rules cloud upsert warning', err);
  }
}

// ==========================================
// 7. TEMPLATES CLOUD SYNC
// ==========================================
export async function fetchCloudTemplates(fallback: SaaSEmailTemplate[] = []): Promise<SaaSEmailTemplate[]> {
  try {
    const { data, error } = await supabase.from('templates').select('*');
    if (!error && data && data.length > 0) {
      const templates: SaaSEmailTemplate[] = data.map((row: any) => ({
        id: row.id,
        type: row.type || 'general-notice',
        title: row.title || '',
        subject: row.subject || '',
        body: row.body || ''
      }));
      setLocalItem('crm_saas_email_templates_v3', templates);
      return templates;
    }
  } catch (err) {
    console.warn('[CloudDB] Templates fetch falling back to local storage', err);
  }
  return getLocalItem('crm_saas_email_templates_v3', fallback);
}

export async function saveCloudTemplates(templates: SaaSEmailTemplate[]): Promise<void> {
  setLocalItem('crm_saas_email_templates_v3', templates);
  try {
    const payload = templates.map(t => ({
      id: t.id,
      type: t.type,
      title: t.title,
      subject: t.subject,
      body: t.body,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('templates').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[CloudDB] Templates cloud upsert warning', err);
  }
}

// ==========================================
// 8. SUPER ADMINS CLOUD SYNC
// ==========================================
export async function fetchCloudSuperAdmins(fallback: SuperAdminUser[] = []): Promise<SuperAdminUser[]> {
  try {
    const { data, error } = await supabase.from('super_admins').select('*');
    if (!error && data && data.length > 0) {
      const admins: SuperAdminUser[] = data.map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.name || row.email.split('@')[0],
        role: row.role || 'Süper Admin',
        addedAt: row.added_at || row.createdAt || new Date().toISOString()
      }));
      setLocalItem('crm_superadmins_v2', admins);
      return admins;
    }
  } catch (err) {
    console.warn('[CloudDB] Super admins fetch falling back to local storage', err);
  }
  return getLocalItem('crm_superadmins_v2', fallback);
}

export async function saveCloudSuperAdmins(admins: SuperAdminUser[]): Promise<void> {
  setLocalItem('crm_superadmins_v2', admins);
  try {
    const payload = admins.map(a => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      added_at: a.addedAt,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('super_admins').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[CloudDB] Super admins cloud upsert warning', err);
  }
}

// ==========================================
// REALTIME DATABASE SYNC LISTENER
// ==========================================
export function subscribeToCloudDb(onChange: (table: string, payload: any) => void) {
  try {
    const channel = supabase
      .channel('cloud-db-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('[CloudDB Realtime] Event received:', payload.table, payload.eventType);
        onChange(payload.table, payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[CloudDB Realtime] Subscribed to Supabase Realtime changes.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[CloudDB Realtime] Subscription error:', err);
    return () => {};
  }
}

