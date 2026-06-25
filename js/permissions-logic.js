let CURRENT_AUTH = null;
let ROLES_LIST = [];
let PERMISSIONS_MAP = {}; // key: role_key + "_" + page_id, value: { can_view, can_action }

const DEFAULT_ROLES = [
  { key: 'uzman', label: 'İSG Uzmanı' },
  { key: 'hekim', label: 'İşyeri Hekimi' },
  { key: 'dsp', label: 'DSP' },
  { key: 'sales', label: 'CRM Uzmanı' },
  { key: 'firma_yetkilisi', label: 'Firma Yetkilisi' }
];

const MODULES = [
  { id: 'crm', name: 'CRM', desc: 'CRM Aday Portföyü ve Teklif Süreçleri' },
  { id: 'crm-reports', name: 'CRM Raporları', desc: 'CRM Satış ve Performans Analizleri' },
  { id: 'schedule', name: 'Ziyaret Takibi', desc: 'Saha Ziyaret Planlaması ve Takvim' },
  { id: 'company', name: 'Firma Yönetimi', desc: 'Firma Kartları, Nace Kodu ve Katip Süreleri' },
  { id: 'workers', name: 'Kadro Yönetimi', desc: 'Çalışan Listesi ve Sağlık Muayene Dosyaları' },
  { id: 'risk', name: 'Uzman Risk Motoru', desc: 'Saha Risk Değerlendirmeleri ve Analiz Raporları' },
  { id: 'medical', name: 'Hekim Sağlık Kartı', desc: 'İşe Giriş Muayeneleri ve Sağlık Raporları' },
  { id: 'actions', name: 'DÖF Aksiyon Havuzu', desc: 'Düzeltici Önleyici Faaliyetler ve Takip' },
  { id: 'accidents', name: 'İş Kazaları', desc: 'Kaza Bildirimleri ve Araştırma Formları' },
  { id: 'near_miss', name: 'Ramak Kala', desc: 'Ramak Kala Olay Bildirim ve İnceleme Süreçleri' },
  { id: 'training', name: 'Eğitim & Sertifika', desc: 'Çalışan Eğitimleri ve Sertifikasyon Takibi' },
  { id: 'ppe', name: 'KKD Zimmet', desc: 'Kişisel Koruyucu Donanım Teslim Tutanakları' },
  { id: 'periodic', name: 'Periyodik Kontrol', desc: 'Basınçlı Kap, Kaldırma Araçları vb. Test Raporları' },
  { id: 'defter', name: 'Dijital Onaylı Defter', desc: 'Fiziksel Defter Sayfalarının Arşivlenmesi' },
  { id: 'kurul', name: 'İSG Kurul Toplantı Motoru', desc: 'Kurul Kararları ve Üye Tebliğleri' }
];

window.onload = async function () {
  const auth = await requireAuthAndRole('permissions');
  if (!auth) return;
  CURRENT_AUTH = auth;
  
  if (CURRENT_AUTH.role !== 'admin' && CURRENT_AUTH.role !== 'super_admin') {
    alert('Bu sayfaya sadece firma yöneticileri (admin) erişebilir.');
    window.location.href = 'dashboard.html';
    return;
  }
  
  document.body.style.display = 'block';
  await loadRolesAndPermissions();
};

async function loadRolesAndPermissions() {
  if (!dbClient || !CURRENT_AUTH) return;

  try {
    // 1. Custom rolleri Supabase'den çek
    let tenantId = CURRENT_AUTH.tenant_id;
    
    const { data: customRoles, error: rolesError } = await dbClient
      .from('tenant_roles')
      .select('role_key, role_name')
      .eq('tenant_id', tenantId);

    if (rolesError) {
      console.error('Custom roller çekilemedi:', rolesError.message);
    }

    // Rol listesini birleştir (default roller + custom roller)
    ROLES_LIST = [...DEFAULT_ROLES];
    if (customRoles) {
      customRoles.forEach(r => {
        ROLES_LIST.push({ key: r.role_key.toLowerCase(), label: r.role_name, isCustom: true });
      });
    }

    // 2. Yetki kısıtlamalarını Supabase'den çek
    const { data: permsData, error: permsError } = await dbClient
      .from('role_permissions')
      .select('role, page, can_view, can_action')
      .eq('tenant_id', tenantId);

    if (permsError) {
      console.error('Yetkiler çekilemedi:', permsError.message);
    }

    PERMISSIONS_MAP = {};
    if (permsData) {
      permsData.forEach(p => {
        PERMISSIONS_MAP[p.role.toLowerCase() + '_' + p.page.toLowerCase()] = {
          can_view: p.can_view,
          can_action: p.can_action
        };
      });
    }

    // Arayüzü çiz
    renderMatris();
  } catch (err) {
    console.error('Veri yükleme hatası:', err);
    alert('Yetkiler yüklenirken bir hata oluştu.');
  }
}

function getFallbackPermission(role, page, type) {
  // Veritabanında kayıt yoksa default sert kodlu izinleri ver
  if (role === 'uzman') {
    const uzmanPages = ['risk', 'accidents', 'near_miss', 'training', 'ppe', 'periodic', 'actions', 'company', 'workers', 'schedule', 'defter', 'kurul'];
    return uzmanPages.includes(page);
  }
  if (role === 'hekim') {
    const hekimPages = ['medical', 'company', 'workers', 'schedule', 'defter', 'kurul'];
    return hekimPages.includes(page);
  }
  if (role === 'dsp') {
    const dspPages = ['company', 'workers', 'schedule'];
    return dspPages.includes(page);
  }
  if (role === 'sales') {
    const salesPages = ['crm', 'crm-reports'];
    return salesPages.includes(page);
  }
  // Firma yetkilisi ve custom roller için default olarak her şey kapalı
  return false;
}

function renderMatris() {
  const headerRow = document.getElementById('matris_header_row');
  const tbody = document.getElementById('matris_body');
  if (!headerRow || !tbody) return;

  // 1. Header sütunlarını çiz
  let headerHtml = '<th>Modül / Sayfa Tanımı</th>';
  ROLES_LIST.forEach(r => {
    headerHtml += `
      <th class="role-col">
        ${escapeHtml(r.label)}
        ${r.isCustom ? '<br><span class="badge-custom">Özel Rol</span>' : ''}
      </th>
    `;
  });
  headerRow.innerHTML = headerHtml;

  // 2. Satırları (Modülleri) çiz
  let bodyHtml = '';
  MODULES.forEach(mod => {
    bodyHtml += `<tr>`;
    bodyHtml += `
      <td>
        <div class="module-info">
          <span class="module-title">${escapeHtml(mod.name)}</span>
          <span class="module-desc">${escapeHtml(mod.desc)}</span>
        </div>
      </td>
    `;

    // Her rol için sütun doldur
    ROLES_LIST.forEach(role => {
      const key = role.key + '_' + mod.id;
      const saved = PERMISSIONS_MAP[key];
      
      const canView = saved ? saved.can_view : getFallbackPermission(role.key, mod.id, 'view');
      const canAction = saved ? saved.can_action : getFallbackPermission(role.key, mod.id, 'action');

      bodyHtml += `
        <td class="role-cell">
          <div class="perm-checkbox-group">
            <label class="perm-checkbox">
              <input type="checkbox" data-role="${role.key}" data-module="${mod.id}" data-type="view" ${canView ? 'checked' : ''} />
              Görüntüle
            </label>
            <label class="perm-checkbox">
              <input type="checkbox" data-role="${role.key}" data-module="${mod.id}" data-type="action" ${canAction ? 'checked' : ''} />
              İşlem Yap
            </label>
          </div>
        </td>
      `;
    });

    bodyHtml += `</tr>`;
  });

  tbody.innerHTML = bodyHtml;
}

function slugify(text) {
  const trMap = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  };
  let slug = text.toString().trim();
  for (let key in trMap) {
    slug = slug.replace(new RegExp(key, 'g'), trMap[key]);
  }
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_');
}

async function addNewRole() {
  const input = document.getElementById('new_role_name');
  if (!input) return;

  const roleName = input.value.trim();
  if (!roleName) {
    alert('Lütfen bir rol adı girin.');
    return;
  }

  const roleKey = slugify(roleName);
  if (!roleKey) {
    alert('Geçersiz rol adı.');
    return;
  }

  // Sistem rollerinin key'leri ile çakışma kontrolü
  const systemKeys = ['super_admin', 'admin', 'sales', 'uzman', 'hekim', 'dsp', 'firma_yetkilisi'];
  if (systemKeys.includes(roleKey)) {
    alert('Bu isimde bir sistem rolü zaten mevcut.');
    return;
  }

  // Listede zaten var mı kontrolü
  if (ROLES_LIST.some(r => r.key === roleKey)) {
    alert('Bu rol zaten eklenmiş.');
    return;
  }

  try {
    const tenantId = CURRENT_AUTH.tenant_id;
    const { error } = await dbClient
      .from('tenant_roles')
      .insert([{
        tenant_id: tenantId,
        role_key: roleKey,
        role_name: roleName
      }]);

    if (error) {
      alert('Rol eklenirken hata oluştu: ' + error.message);
      return;
    }

    input.value = '';
    alert('Rol başarıyla eklendi.');
    await loadRolesAndPermissions();
  } catch (err) {
    console.error('Rol ekleme hatası:', err);
    alert('Bir hata oluştu.');
  }
}

async function savePermissions() {
  if (!dbClient || !CURRENT_AUTH) return;

  const tenantId = CURRENT_AUTH.tenant_id;
  const payload = [];

  // Checkbox'ları oku
  const checkboxes = document.querySelectorAll('.perm-checkbox input');
  const tempMap = {};

  checkboxes.forEach(cb => {
    const role = cb.dataset.role;
    const module = cb.dataset.module;
    const type = cb.dataset.type; // 'view' or 'action'
    const checked = cb.checked;

    const key = role + '_' + module;
    if (!tempMap[key]) {
      tempMap[key] = { role, page: module, can_view: false, can_action: false };
    }

    if (type === 'view') tempMap[key].can_view = checked;
    if (type === 'action') tempMap[key].can_action = checked;
  });

  // Payload oluştur
  Object.keys(tempMap).forEach(k => {
    payload.push({
      tenant_id: tenantId,
      role: tempMap[k].role,
      page: tempMap[k].page,
      can_view: tempMap[k].can_view,
      can_action: tempMap[k].can_action
    });
  });

  try {
    // Toplu upsert yapıyoruz (tabloda UNIQUE constraint var)
    const { error } = await dbClient
      .from('role_permissions')
      .upsert(payload, { onConflict: 'tenant_id,role,page' });

    if (error) {
      alert('Yetkiler kaydedilirken hata oluştu: ' + error.message);
      return;
    }

    // LocalStorage veya session tabanlı navigasyon önbelleğini temizleyelim (varsa)
    // Böylece sayfa yenilendiğinde yeni yetkiler anında yansır.
    alert('Yetkiler başarıyla kaydedildi.');
    await loadRolesAndPermissions();
    
    // Navigasyon menüsünü anlık güncellemek için nav fonksiyonunu tekrar tetikleyebiliriz
    if (typeof window.applyRoleBasedNavigation === 'function' && CURRENT_AUTH) {
      window.applyRoleBasedNavigation(CURRENT_AUTH.role);
    }
  } catch (err) {
    console.error('Kaydetme hatası:', err);
    alert('Bir hata oluştu.');
  }
}

function escapeHtml(value) {
  return (value || '').toString().replace(/[&<>'"]/g, function (char) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char];
  });
}

function escapeAttr(value) {
  return (value || '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
