import { supabase } from './supabase';
import type { OfferRecord, ContractRecord, SaaSTenant } from '../types';
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
        .map((row: any) => ({
        id: row.id,
        tenantCode: row.tenant_code || `TNT-${row.id.substring(0, 4).toUpperCase()}`,
        companyName: row.name || row.companyName || 'Test OSGB 3',
        contactName: row.contact_name || row.contactName || 'Orhan Vardar',
        email: row.email || 'orhan.vardar@gmail.com',
        phone: row.phone || '0850 000 00 00',
        city: row.city || 'İstanbul',
        package: row.package || 'Enterprise',
        status: row.status || (row.is_active ? 'Aktif' : 'Pasif'),
        paymentStatus: row.payment_status || 'Sorunsuz',
        healthStatus: row.health_status || 'Mükemmel',
        billingCycle: row.billing_cycle || 'Yıllık',
        monthlyFee: row.monthly_fee || 28000,
        annualFee: row.annual_fee || 336000,
        maxUsers: row.max_users || 50,
        activeUsers: row.active_users || 1,
        startDate: row.start_date || '2026-01-01',
        endDate: row.end_date || '2027-01-01',
        autoRenew: row.auto_renew ?? true,
        notes: row.notes || 'Supabase Bulut Veritabanı',
        modulesEnabled: row.modules_enabled || { crm: true, offers: true, contracts: true, documents: true, analytics: true },
        lastLoginAt: 'Bugün',
        createdBy: 'orhan.vardar@gmail.com',
        createdAt: row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR'),
        updatedBy: 'orhan.vardar@gmail.com',
        updatedAt: new Date().toLocaleString('tr-TR'),
        activationStatus: 'Hesap Aktif (Şifre Belirlendi)'
      }));
      const cleanList = tenants.length > 0 ? tenants : fallback;
      setLocalItem('crm_saas_tenants_v3', cleanList);
      return cleanList;
    }
  } catch (err) {
    console.warn('[CloudDB] Tenants fetch falling back to local storage', err);
  }
  return getLocalItem('crm_saas_tenants_v3', fallback);
}

export async function saveCloudTenants(tenants: SaaSTenant[]): Promise<void> {
  setLocalItem('crm_saas_tenants_v3', tenants);
  try {
    const validUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const payload = tenants
      .filter(t => t.id && validUuidRegex.test(t.id))
      .map(t => ({
        id: t.id,
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
        modules_enabled: t.modulesEnabled,
        updated_at: new Date().toISOString()
      }));
    if (payload.length > 0) {
      await supabase.from('tenants').upsert(payload, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn('[CloudDB] Tenants cloud upsert warning', err);
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
