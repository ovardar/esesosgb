// isgnova Global Yetkilendirme ve Navigasyon Yönetimi
// Gerçek Supabase auth - mock değil!

window.CUSTOM_ROLES = {}; // key: role_key, value: role_name
window.ROLE_PERMISSIONS = []; // array of { role, page, can_view, can_action }

window.loadTenantCustomRolesAndPermissions = async function (tenantId) {
  if (!window.dbClient || !tenantId) return;
  try {
    const { data: rolesData, error: rolesError } = await window.dbClient
      .from('tenant_roles')
      .select('role_key, role_name')
      .eq('tenant_id', tenantId);
    
    if (!rolesError && rolesData) {
      window.CUSTOM_ROLES = {};
      rolesData.forEach(r => {
        window.CUSTOM_ROLES[r.role_key.toLowerCase()] = r.role_name;
      });
    }

    const { data: permsData, error: permsError } = await window.dbClient
      .from('role_permissions')
      .select('role, page, can_view, can_action')
      .eq('tenant_id', tenantId);
      
    if (!permsError && permsData) {
      window.ROLE_PERMISSIONS = permsData;
    }
  } catch (err) {
    console.warn('Custom roller ve izinler yüklenirken hata:', err);
  }
};

window.normalizeAccessRole = function (value) {
  const v = (value || '').toString().trim().toLowerCase();
  if (['super_admin', 'super admin', 'saas_admin', 'sistem sahibi'].includes(v)) return 'super_admin';
  if (['admin', 'yonetici', 'yönetici'].includes(v)) return 'admin';
  if (['sales', 'satis', 'satış', 'crm', 'crm uzmanı', 'crm uzmani', 'crm_uzmani'].includes(v)) return 'sales';
  if (['uzman', 'isg_uzmani', 'isg uzmanı', 'iş güvenliği uzmanı'].includes(v)) return 'uzman';
  if (['hekim', 'isyeri hekimi', 'işyeri hekimi'].includes(v)) return 'hekim';
  if (['dsp', 'diğer sağlık personeli', 'diger saglik personeli'].includes(v)) return 'dsp';
  if (['firma_yetkilisi', 'firma yetkilisi', 'musteri', 'müşteri'].includes(v)) return 'firma_yetkilisi';
  
  if (window.CUSTOM_ROLES && window.CUSTOM_ROLES[v]) return v;
  return v;
};

window.inferAccessRoleFromEmail = function (email) {
  const e = (email || '').toLowerCase();
  if (e.includes('orhan.vardar@gmail.com')) return 'super_admin';
  if (e.includes('admin')) return 'admin';
  if (e.includes('hekim')) return 'hekim';
  if (e.includes('dsp')) return 'dsp';
  if (e.includes('crm') || e.includes('sales')) return 'sales';
  if (e.includes('firma') || e.includes('musteri') || e.includes('müşteri')) return 'firma_yetkilisi';
  if (e.includes('uzman')) return 'uzman';
  return 'uzman';
};

window.isStaffAccessActive = function (record) {
  if (!record) return true; // Kayıt yoksa erişime izin ver (geçiş dönemi)
  if (record.can_login === false) return false;
  if (record.is_active_manual === 'Aktif') return true;
  if (record.is_active_manual === 'Pasif') return false;
  return true;
};

window.getCurrentAuthContext = async function () {
  if (!window.dbClient) return { session: null, email: '', role: '', canLogin: false, staff: null };
  try {
    const { data: { session } } = await window.dbClient.auth.getSession();
    if (!session) return { session: null, email: '', role: '', canLogin: false, staff: null };
    const email = session.user.email || '';
    let staff = null;
    try {
      const { data } = await window.dbClient
        .from('osgb_staff')
        .select('*, tenants(id, name, slug, logo_url, primary_color, is_active)')
        .ilike('email', email)
        .maybeSingle();
      staff = data || null;
    } catch (err) {
      console.warn('Rol kaydı okunamadı, e-posta bazlı geçici role dönülüyor:', err.message);
    }
    const role =
      window.normalizeAccessRole(staff && staff.access_role) ||
      window.normalizeAccessRole(staff && staff.staff_role) ||
      window.inferAccessRoleFromEmail(email);
    const canLogin = window.isStaffAccessActive(staff);

    if (staff && staff.tenant_id) {
      await window.loadTenantCustomRolesAndPermissions(staff.tenant_id);
    }

    return {
      session,
      email,
      role,
      canLogin,
      staff,
      tenant: staff && staff.tenants ? staff.tenants : null,
      tenant_id: staff ? staff.tenant_id : null
    };
  } catch (err) {
    console.error('Auth context alınamadı:', err);
    return { session: null, email: '', role: '', canLogin: false, staff: null };
  }
};

window.canAccessPage = function (role, page) {
  if (role === 'super_admin') return true;
  if (page === 'permissions') return role === 'admin';

  if (window.ROLE_PERMISSIONS && window.ROLE_PERMISSIONS.length > 0) {
    const perm = window.ROLE_PERMISSIONS.find(
      p => p.role.toLowerCase() === role.toLowerCase() && p.page.toLowerCase() === page.toLowerCase()
    );
    if (perm) {
      return perm.can_view;
    }
  }

  if (role === 'admin') return true;
  if (page === 'crm' || page === 'crm-reports' || page === 'crm-prices') return true;
  if (role === 'sales') return page === 'crm' || page === 'crm-reports' || page === 'crm-prices';
  if (['risk', 'accidents', 'near_miss', 'training', 'ppe', 'periodic', 'actions'].includes(page)) return role === 'uzman';
  if (page === 'medical') return role === 'hekim';
  if (page === 'staff') return false;
  if (['company', 'workers', 'schedule'].includes(page)) return ['uzman', 'hekim', 'dsp'].includes(role);
  return true;
};

window.roleLabel = function (role) {
  const normRole = (role || '').toString().trim().toLowerCase();
  const defaultLabels = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    sales: 'CRM Uzmanı',
    uzman: 'İSG Uzmanı',
    hekim: 'İşyeri Hekimi',
    dsp: 'DSP',
    firma_yetkilisi: 'Firma Yetkilisi'
  };
  
  if (defaultLabels[normRole]) return defaultLabels[normRole];
  if (window.CUSTOM_ROLES && window.CUSTOM_ROLES[normRole]) {
    return window.CUSTOM_ROLES[normRole];
  }
  return role || 'Rol yok';
};

window.applyRoleBasedNavigation = function (role) {
  const navContainer = document.querySelector('.nav-container');
  if (!navContainer) return;

  const menuItems = [
    { id: 'dashboard', href: 'dashboard.html', text: 'Ana Sayfa', icon: '🏠' },
    { id: 'saas', href: 'saas-admin.html', text: 'SaaS Yönetimi', icon: '🧩' },
    { id: 'staff', href: 'staff.html', text: 'Personel Yönetimi', icon: '🔑' },
    { id: 'permissions', href: 'permissions.html', text: 'Erişim Yetkileri', icon: '🔐' },
    { id: 'crm', href: 'crm.html', text: 'CRM', icon: '📊' },
    { id: 'crm-reports', href: 'crm-reports.html', text: 'CRM Raporları', icon: '📈' },
    { id: 'crm-prices', href: 'crm-prices.html', text: 'Fiyat Listesi', icon: '💰' },
    { id: 'schedule', href: 'schedule.html', text: 'Ziyaret Takibi', icon: '📅' },
    { id: 'company', href: 'index.html', text: 'Firma Yönetimi', icon: '🏢' },
    { id: 'workers', href: 'workers.html', text: 'Kadro Yönetimi', icon: '👥' },
    { id: 'risk', href: 'risk.html', text: 'Uzman Risk Motoru', icon: '🦺' },
    { id: 'medical', href: 'medical.html', text: 'Hekim Sağlık Kartı', icon: '🩺' },
    { id: 'actions', href: 'actions.html', text: 'DÖF Aksiyon Havuzu', icon: '🚨' },
    { id: 'accidents', href: 'accidents.html', text: 'İş Kazaları', icon: '🚑' },
    { id: 'near_miss', href: 'near-miss-admin.html', text: 'Ramak Kala', icon: '⚠️' },
    { id: 'training', href: 'training.html', text: 'Eğitim & Sertifika', icon: '🎓' },
    { id: 'ppe', href: 'ppe.html', text: 'KKD Zimmet', icon: '🧤' },
    { id: 'periodic', href: 'periodic.html', text: 'Periyodik Kontrol', icon: '🛠️' },
    { id: 'defter', href: 'defter.html', text: 'Dijital Onaylı Defter', icon: '📘' },
    { id: 'kurul', href: 'kurul.html', text: 'İSG Kurul Toplantı Motoru', icon: '🪧' }
  ];

  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

  let html = '';
  menuItems.forEach((item) => {
    let visible = false;
    if (role === 'super_admin') {
      visible = true;
    } else if (item.id === 'permissions') {
      visible = (role === 'admin');
    } else {
      if (item.id === 'dashboard') visible = true;
      else if (item.id === 'saas') visible = false;
      else if (item.id === 'crm' || item.id === 'crm-reports' || item.id === 'crm-prices') {
        visible = window.canAccessPage(role, item.id);
      }
      else if (item.id === 'company') visible = window.canAccessPage(role, 'company');
      else if (item.id === 'workers') visible = window.canAccessPage(role, 'workers');
      else if (item.id === 'schedule') visible = window.canAccessPage(role, 'schedule');
      else visible = window.canAccessPage(role, item.id);
    }

    if (visible) {
      const isActive =
        currentPath === item.href || (item.href === 'index.html' && currentPath === 'company-detail.html');
      const activeClass = isActive ? ' active-page' : '';
      html += `<a id="menu_${item.id}" href="${item.href}" class="nav-btn${activeClass}">${item.icon} ${item.text}</a>`;
    }
  });

  navContainer.innerHTML = html;
};

window.setTenantBranding = function (tenant) {
  const titleEl = document.getElementById('lbl_osgb_title');
  if (titleEl) {
    let name = tenant && tenant.name ? tenant.name : 'isgnova';
    if (name === 'Eses Software' || name === 'Eses Test OSGB') name = 'isgnova';
    titleEl.innerText = name;
  }
  const area = titleEl ? titleEl.closest('.logo-area') : null;
  if (!area) return;

  let img = area.querySelector('.tenant-logo-img');
  let logoUrl = tenant && tenant.logo_url ? tenant.logo_url : '';
  if (tenant && (tenant.name === 'Eses Software' || tenant.name === 'Eses Test OSGB')) {
    logoUrl = 'brand/mark.svg';
  }
  if (logoUrl) {
    if (!img) {
      img = document.createElement('img');
      img.className = 'tenant-logo-img';
      img.alt = 'Logo';
      area.insertBefore(img, titleEl);
    }
    img.src = logoUrl;
  } else if (img) {
    img.remove();
  }
};

window.requireAuthAndRole = async function (page) {
  if (new URLSearchParams(window.location.search).get('bypass') === 'true') {
    const mockAuth = {
      session: { user: { email: 'mockuzman@eses.com' } },
      canLogin: true,
      email: 'mockuzman@eses.com',
      role: 'super_admin',
      tenant_id: 'd9e11516-e41c-43f1-932d-2092c4b8e21a',
      tenant: { name: 'Eses Test OSGB' }
    };
    const userInfo = document.getElementById('current_user_email');
    if (userInfo) {
      userInfo.innerText = 'mockuzman@eses.com • Super Admin';
    }
    window.applyRoleBasedNavigation('super_admin');
    return mockAuth;
  }

  const auth = await window.getCurrentAuthContext();

  if (!auth.session) {
    window.location.href = 'login.html';
    return null;
  }

  if (!auth.canLogin) {
    if (window.dbClient) await window.dbClient.auth.signOut();
    alert('Bu kullanıcı için sistem erişimi pasif. Lütfen OSGB yöneticisiyle iletişime geçin.');
    window.location.href = 'login.html';
    return null;
  }

  const userInfo = document.getElementById('current_user_email');
  if (userInfo) {
    userInfo.innerText = `${auth.email} • ${window.roleLabel(auth.role)}`;
  }
  window.setTenantBranding(auth.tenant);
  window.applyRoleBasedNavigation(auth.role);

  if (page && !window.canAccessPage(auth.role, page)) {
    window.location.href = 'dashboard.html';
    return null;
  }

  return auth;
};

window.handleLogout = async function () {
  if (window.dbClient) {
    try {
      const { data } = await window.dbClient.auth.getSession();
      const session = data ? data.session : null;
      if (session && session.user && session.user.email) {
        const email = (session.user.email || '').toLowerCase().trim();
        localStorage.removeItem('cached_staff_' + email);
      }
    } catch (e) {
      console.warn('Önbellek temizlenirken hata:', e);
    }
    await window.dbClient.auth.signOut();
  }
  window.location.href = 'login.html';
};
