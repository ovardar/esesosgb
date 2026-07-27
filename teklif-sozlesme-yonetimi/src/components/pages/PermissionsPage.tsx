import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { initialSaaSTenants } from '../../data/saasWorkbench';
import { initialTenantUsersMap, TenantUser } from '../../data/tenantUsers';
import { permissionSeeds } from '../../data/workbench';
import type { SaaSTenant } from '../../types';

type Props = {
  impersonatedTenant?: SaaSTenant | null;
  onUpdateTenantUsersCount?: (tenantId: string, newCount: number) => void;
  isSuperAdmin?: boolean;
};

export function PermissionsPage({ impersonatedTenant, onUpdateTenantUsersCount, isSuperAdmin = true }: Props) {
  // SaaS Tenants list
  const [tenants] = useState<SaaSTenant[]>(initialSaaSTenants);

  // Selected active tenant for user management
  const [activeTenantId, setActiveTenantId] = useState<string>(
    impersonatedTenant ? impersonatedTenant.id : 'tenant-2' // Default to Vip İş Sağlığı (tenant-2)
  );

  // All Tenants User Database State
  const [usersMap, setUsersMap] = useState<Record<string, TenantUser[]>>(initialTenantUsersMap);

  // Superadmin Email Store
  const [superAdmins, setSuperAdmins] = useState<Array<{ id: string; email: string; name: string; addedAt: string }>>(() => {
    try {
      const saved = localStorage.getItem('crm_superadmins_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'sa-1', email: 'admin@osgbsistem.com', name: 'Sistem Yöneticisi (Ana Kullanıcı)', addedAt: '2025-01-01' },
      { id: 'sa-2', email: 'ovardar@gmail.com', name: 'Oğuz Vardar (Süper Admin)', addedAt: '2025-01-01' }
    ];
  });

  const [newSuperAdminEmail, setNewSuperAdminEmail] = useState('');
  const [newSuperAdminName, setNewSuperAdminName] = useState('');
  const [showSuperAdminSection, setShowSuperAdminSection] = useState(false);
  const [superAdminInviteUser, setSuperAdminInviteUser] = useState<{ name: string; email: string } | null>(null);

  // Save superAdmins to localStorage
  useMemo(() => {
    try {
      localStorage.setItem('crm_superadmins_v2', JSON.stringify(superAdmins));
    } catch (e) {
      console.error(e);
    }
  }, [superAdmins]);

  const handleAddSuperAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = newSuperAdminEmail.trim().toLowerCase();
    if (!emailClean) return;
    if (superAdmins.some((sa) => sa.email.toLowerCase() === emailClean)) {
      alert('Bu e-posta adresi zaten Süper Admin olarak ekli.');
      return;
    }

    const newSA = {
      id: `sa-${Date.now()}`,
      email: emailClean,
      name: newSuperAdminName.trim() || emailClean,
      addedAt: new Date().toISOString().split('T')[0]
    };

    setSuperAdmins((prev) => [...prev, newSA]);
    setNewSuperAdminEmail('');
    setNewSuperAdminName('');
    setSuperAdminInviteUser(newSA);
  };

  const handleRemoveSuperAdmin = (id: string, name: string) => {
    if (superAdmins.length <= 1) {
      alert('Sistemde en az 1 adet Süper Admin bulunmalıdır.');
      return;
    }
    if (window.confirm(`"${name}" kullanıcısının Süper Admin yetkisini kaldırmak istediğinize emin misiniz?`)) {
      setSuperAdmins((prev) => prev.filter((sa) => sa.id !== id));
    }
  };

  // Search & Role Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // UI Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  
  // Password Setup & Activation Simulation Modal State
  const [passwordSetupUser, setPasswordSetupUser] = useState<TenantUser | null>(null);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);

  // New & Edit User Form State
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Müşteri Temsilcisi',
    status: 'Aktif' as 'Aktif' | 'Pasif',
    userType: 'Sistem Kullanıcısı' as 'Sistem Kullanıcısı' | 'Saha / Danışman Kadro'
  });


  // Current Selected Tenant Details
  const currentTenant = useMemo(() => {
    return (
      (impersonatedTenant && impersonatedTenant.id === activeTenantId ? impersonatedTenant : null) ||
      tenants.find((t) => t.id === activeTenantId) ||
      tenants[0]
    );
  }, [activeTenantId, impersonatedTenant, tenants]);

  // Synchronize when impersonatedTenant prop changes
  useMemo(() => {
    if (impersonatedTenant) {
      setActiveTenantId(impersonatedTenant.id);
    }
  }, [impersonatedTenant]);

  // Current Tenant Users List
  const currentUsers = useMemo(() => {
    return usersMap[currentTenant.id] || [];
  }, [usersMap, currentTenant]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return currentUsers.filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role.includes(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [currentUsers, searchQuery, roleFilter]);

  // Quota & Sizing calculations
  const maxUsersLimit = currentTenant.maxUsers || 50;
  const activeCount = currentUsers.filter((u) => u.status === 'Aktif').length;
  const isLimitReached = maxUsersLimit > 0 && activeCount >= maxUsersLimit;
  const usagePercent = maxUsersLimit > 0 ? Math.round((activeCount / maxUsersLimit) * 100) : 0;

  // Handle Send Invite Email
  const handleSendInvite = (usr: TenantUser) => {
    const inviteLink = `https://app.osgb-sistem.com/set-password?tenant=${currentTenant.id}&token=${Math.random().toString(36).substring(2, 10)}`;
    alert(
      `✉️ Davet & Şifre Oluşturma E-postası Gönderildi!\n\nAlıcı: ${usr.email}\nFirma: ${currentTenant.companyName}\n\nÖzel Aktivasyon Bağlantısı:\n${inviteLink}`
    );
  };

  // Handle Copy Invite Link
  const handleCopyInviteLink = (usr: TenantUser) => {
    const inviteLink = `https://app.osgb-sistem.com/set-password?tenant=${currentTenant.id}&user=${usr.id}&token=MAGIC_LINK_TOKEN`;
    navigator.clipboard?.writeText(inviteLink);
    alert(`📋 ${usr.name} için Özel Aktivasyon & Şifre Belirleme Bağlantısı kopyalandı:\n${inviteLink}`);
  };

  // Handle Add User Submit
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      alert(
        `⛔ KULLANICI LİMİTİ DOLDU!\n\n${currentTenant.companyName} firmanızın abonelik paketi maksimum ${maxUsersLimit} kullanıcıya izin vermektedir.\nYeni kullanıcı ekleyebilmek için Super Admin ile iletişime geçiniz.`
      );
      return;
    }

    const cleanDomain = currentTenant.email.split('@')[1] || 'osgb-sistem.com';

    const newUser: TenantUser = {
      id: `usr-${currentTenant.id}-${Date.now()}`,
      tenantId: currentTenant.id,
      name: userForm.name,
      email: userForm.email || `${userForm.name.toLowerCase().replace(/\s+/g, '.')}@${cleanDomain}`,
      role: userForm.role,
      phone: userForm.phone || '0532 000 00 00',
      status: 'Aktif',
      userType: userForm.userType || 'Sistem Kullanıcısı',
      addedAt: new Date().toISOString().split('T')[0]
    };

    const updatedList = [newUser, ...currentUsers];
    setUsersMap((prev) => ({ ...prev, [currentTenant.id]: updatedList }));

    if (onUpdateTenantUsersCount) {
      onUpdateTenantUsersCount(currentTenant.id, updatedList.filter((u) => u.status === 'Aktif').length);
    }

    setIsAddModalOpen(false);
    setUserForm({ name: '', email: '', phone: '', role: 'Müşteri Temsilcisi', status: 'Aktif', userType: 'Sistem Kullanıcısı' });


    // Open password setup simulation modal immediately for user testing!
    setPasswordSetupUser(newUser);
    setPasswordForm({ password: '', confirmPassword: '' });
  };

  // Handle Save Password & Activate Account Simulation
  const handleSavePasswordSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordSetupUser) return;

    if (passwordForm.password.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      alert('Girilen şifreler birbiriyle eşleşmiyor.');
      return;
    }

    alert(
      `🎉 TEBRİKLER!\n\n"${passwordSetupUser.name}" (${passwordSetupUser.email}) kullanıcısı kendi özel şifresini başarıyla belirledi ve ${currentTenant.companyName} sistemine İLK GİRİŞİNİ yaptı!`
    );

    setPasswordSetupUser(null);
  };

  // Handle Save User Edit
  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedList = currentUsers.map((u) =>
      u.id === editingUser.id
        ? {
            ...u,
            name: userForm.name,
            email: userForm.email,
            phone: userForm.phone,
            role: userForm.role,
            status: userForm.status,
            userType: userForm.userType
          }
        : u
    );

    setUsersMap((prev) => ({ ...prev, [currentTenant.id]: updatedList }));
    setEditingUser(null);
    setUserForm({ name: '', email: '', phone: '', role: 'Müşteri Temsilcisi', status: 'Aktif', userType: 'Sistem Kullanıcısı' });
  };

  // Quick toggle userType handler
  const handleToggleUserType = (usr: TenantUser) => {
    const newType: 'Sistem Kullanıcısı' | 'Saha / Danışman Kadro' =
      (usr.userType || 'Sistem Kullanıcısı') === 'Sistem Kullanıcısı'
        ? 'Saha / Danışman Kadro'
        : 'Sistem Kullanıcısı';
    const updatedList: TenantUser[] = currentUsers.map((u) => (u.id === usr.id ? { ...u, userType: newType } : u));
    setUsersMap((prev) => ({ ...prev, [currentTenant.id]: updatedList }));
  };


  // Handle Delete User
  const handleDeleteUser = (usr: TenantUser) => {
    if (window.confirm(`"${usr.name}" isimli kullanıcıyı silmek istediğinize emin misiniz?`)) {
      const updatedList = currentUsers.filter((u) => u.id !== usr.id);
      setUsersMap((prev) => ({ ...prev, [currentTenant.id]: updatedList }));

      if (onUpdateTenantUsersCount) {
        onUpdateTenantUsersCount(currentTenant.id, updatedList.filter((u) => u.status === 'Aktif').length);
      }

      alert(`🗑️ Kullanıcı (${usr.name}) başarıyla silindi ve kullanıcı kontenjanı güncellendi.`);
    }
  };

  return (
    <section className="panel panel-wide panel-elevated page-layout" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 4 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, margin: '0 0 4px 0' }}>
            KİRACI CRM • PERSONEL & YETKİ YÖNETİMİ
          </p>
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {currentTenant.companyName} Kullanıcı Kadrosu
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          {/* ADD USER BUTTON */}
          <button
            type="button"
            className={isLimitReached ? 'btn-action-ghost' : 'btn-action-primary'}
            disabled={isLimitReached}
            style={{
              height: 38,
              padding: '0 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: 10,
              opacity: isLimitReached ? 0.65 : 1,
              cursor: isLimitReached ? 'not-allowed' : 'pointer'
            }}
            onClick={() => {
              if (isLimitReached) {
                alert(
                  `⛔ KULLANICI LİMİTİ DOLDU!\n\n${currentTenant.companyName} lisans sınırınız (${maxUsersLimit} Kullanıcı) dolmuştur. Yeni kullanıcı eklemek için paketinizi yükseltiniz.`
                );
              } else {
                setUserForm({ name: '', email: '', phone: '', role: 'Müşteri Temsilcisi', status: 'Aktif', userType: 'Sistem Kullanıcısı' });
                setIsAddModalOpen(true);
              }
            }}
          >
            {isLimitReached ? '⛔ Lisans Limiti Doldu (+ Eklenemez)' : '+ Yeni Kullanıcı / Personel Ekle'}
          </button>
        </div>
      </div>

      {/* SUPER ADMIN MANAGEMENT PANEL (SADECE SÜPER ADMİNLER GÖREBİLİR) */}
      {showSuperAdminSection && isSuperAdmin && !impersonatedTenant && (
        <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#6366f1' }}>🛡️ SaaS Süper Admin Yetkisi Tanımlama</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Söz konusu kullanıcılar tüm SaaS yazılımının sahibidir (SaaS Yönetimi paneline erişebilir). Müşteri kullanıcıları kesinlikle Süper Admin yapılamaz.
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 12, fontWeight: 800, background: '#6366f1', color: '#fff' }}>
              {superAdmins.length} Aktif Süper Admin
            </span>
          </div>

          {/* SUPER ADMIN LIST */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10, marginBottom: 16 }}>
            {superAdmins.map((sa) => (
              <div
                key={sa.id}
                style={{
                  background: 'var(--surface-strong)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'block' }}>{sa.name}</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 700 }}>✉️ {sa.email}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-action-ghost"
                    style={{ padding: '3px 8px', fontSize: '0.74rem', color: '#6366f1' }}
                    onClick={() => setSuperAdminInviteUser(sa)}
                  >
                    ✉️ Davet Bağlantısı
                  </button>
                  <button
                    type="button"
                    className="btn-action-ghost"
                    style={{ padding: '3px 8px', fontSize: '0.74rem', color: '#ef4444' }}
                    onClick={() => handleRemoveSuperAdmin(sa.id, sa.name)}
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* FORM TO ADD NEW SUPERADMIN */}
          <form onSubmit={handleAddSuperAdmin} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: 'var(--surface-strong)', padding: 12, borderRadius: 10, border: '1px dashed var(--border)' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>+ Yeni Süper Admin Ekle:</span>
            <input
              type="email"
              required
              placeholder="Süper Admin E-posta (Örn: yonetici@osgbsistem.com)"
              value={newSuperAdminEmail}
              onChange={(e) => setNewSuperAdminEmail(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '6px 12px', fontSize: '0.84rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
            />
            <input
              type="text"
              placeholder="Ad Soyad / Unvan"
              value={newSuperAdminName}
              onChange={(e) => setNewSuperAdminName(e.target.value)}
              style={{ flex: 1, minWidth: 160, padding: '6px 12px', fontSize: '0.84rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
            />
            <button type="submit" className="btn-action-primary" style={{ padding: '6px 16px', fontSize: '0.84rem', background: '#6366f1' }}>
              + Süper Admin Yetkisi Ver
            </button>
          </form>
        </div>
      )}

      {/* LIMIT WARNING BANNER */}
      {isLimitReached ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1.5px solid rgba(239, 68, 68, 0.3)', padding: '14px 18px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ color: '#b91c1c', fontSize: '0.95rem' }}>
              ⛔ SaaS Kullanıcı Lisans Sınırına Ulaşıldı ({activeCount} / {maxUsersLimit} Kullanıcı - %{usagePercent})
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#7f1d1d' }}>
              {currentTenant.companyName} firmasının paket lisans kotası (%100) dolmiştir. Yeni personel tanımı yapılamaz. Yeni kullanıcı eklemek için paketi yükseltin.
            </p>
          </div>
          <span className="mini-badge" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
            %100 LİSANS DOLU
          </span>
        </div>
      ) : (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 18px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#047857', fontSize: '0.88rem', fontWeight: 600 }}>
            ✓ {currentTenant.companyName} Kullanıcı Kotası: {activeCount} / {maxUsersLimit} Aktif Kullanıcı (%{usagePercent}) • Kullanılabilir Kontenjan: {maxUsersLimit - activeCount} Kullanıcı
          </span>
          <span className="mini-badge" style={{ background: '#10b981', color: '#fff', border: 'none' }}>
            LİSANS UYGUN (%{usagePercent})
          </span>
        </div>
      )}



      {/* Filter Bar */}
      <div className="customer-filter-grid" style={{ marginBottom: 10, gridTemplateColumns: '2fr 1fr' }}>
        <label className="search-field customer-search-field">
          <span>Kullanıcı Ara</span>
          <input
            type="text"
            placeholder="Ad soyad, e-posta veya telefon ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>

        <label className="select-field">
          <span>Sistem Rolü Filtresi</span>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Tüm Roller</option>
            <option value="Admin">Admin / Yönetici</option>
            <option value="İSG Uzmanı">İSG Uzmanları</option>
            <option value="İşyeri Hekimi">İşyeri Hekimleri</option>
            <option value="Saha">Saha Operasyon</option>
            <option value="CRM">CRM & Satış</option>
            <option value="Teklif">Teklif & Sözleşme</option>
          </select>
        </label>
      </div>

      {/* Main Tenant Users Table */}
      <article className="panel panel-wide" style={{ padding: 18 }}>
        <div className="section-heading" style={{ marginBottom: 14 }}>
          <div>
            <p className="eyebrow">{currentTenant.companyName}</p>
            <h4 style={{ margin: 0 }}>
              Görüntülenen Kullanıcılar ({filteredUsers.length} / {currentUsers.length})
            </h4>
          </div>
          <span className="mini-badge">
            Sayfa: 1 • Toplam: {currentUsers.length} Kayıt
          </span>
        </div>

        <div className="customer-table-wrap">
          <table className="customer-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Kullanıcı Ad Soyad & İletişim</th>
                <th>Sistem Rolü</th>
                <th>Telefon</th>
                <th>Kayıt Tarihi</th>
                <th>Aktivasyon & Davet</th>
                <th style={{ textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="customer-table-empty">
                    Arama kriterlerine uygun kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr, index) => (
                  <tr key={usr.id}>
                    <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{index + 1}</span></td>
                    <td>
                      <strong style={{ fontSize: '0.92rem' }}>{usr.name}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{usr.email}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                        <span className="mini-badge">{usr.role}</span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: (usr.userType || 'Sistem Kullanıcısı') === 'Sistem Kullanıcısı' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: (usr.userType || 'Sistem Kullanıcısı') === 'Sistem Kullanıcısı' ? '#6366f1' : '#d97706'
                          }}
                        >
                          {(usr.userType || 'Sistem Kullanıcısı') === 'Sistem Kullanıcısı' ? '💻 Sistem Kullanıcısı' : '📋 Saha / Danışman Kadro'}
                        </span>
                      </div>
                    </td>
                    <td><span style={{ fontSize: '0.84rem' }}>{usr.phone}</span></td>
                    <td><span style={{ fontSize: '0.8rem' }}>{usr.addedAt}</span></td>
                    <td>
                      <span
                        className="mini-badge"
                        style={{
                          background: usr.status === 'Aktif' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: usr.status === 'Aktif' ? '#047857' : '#b91c1c'
                        }}
                      >
                        ● {usr.status === 'Aktif' ? 'Hesap Aktif' : 'Davet Bekliyor'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          className="btn-action-ghost"
                          style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                          onClick={() => handleSendInvite(usr)}
                          title="E-posta ile aktivasyon davet linki gönder"
                        >
                          ✉️ Davet Gönder
                        </button>

                        <button
                          className="btn-action-ghost"
                          style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                          onClick={() => handleCopyInviteLink(usr)}
                          title="Magic Link kopyala"
                        >
                          🔗 Link Kopyala
                        </button>

                        <button
                          className="btn-action-ghost"
                          style={{ fontSize: '0.76rem', padding: '5px 10px', color: '#047857', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                          onClick={() => {
                            setPasswordSetupUser(usr);
                            setPasswordForm({ password: '', confirmPassword: '' });
                          }}
                          title="Kullanıcının e-postaya tıklayıp şifre belirlemesini simüle et"
                        >
                          🔑 Şifre Belirle & Giriş Yap
                        </button>

                        <button
                          className="btn-action-ghost"
                          style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                          onClick={() => {
                            setEditingUser(usr);
                            setUserForm({
                              name: usr.name,
                              email: usr.email,
                              phone: usr.phone,
                              role: usr.role,
                              status: usr.status,
                              userType: usr.userType || 'Sistem Kullanıcısı'
                            });
                          }}
                        >
                          ✏️ Düzenle
                        </button>

                        <button
                          className="btn-action-ghost"
                          style={{ fontSize: '0.76rem', padding: '5px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          onClick={() => handleDeleteUser(usr)}
                        >
                          🗑️ Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Role Definitions Section */}
      <div className="section-heading" style={{ marginTop: 10 }}>
        <div>
          <p className="eyebrow">Yetki Tanımları</p>
          <h4>Rol Bazlı Erişim Modeli (RBAC)</h4>
        </div>
      </div>

      <div className="permission-grid">
        {permissionSeeds.map((permission) => (
          <article className="permission-card" key={permission.role}>
            <span className="module-tag">{permission.access}</span>
            <strong>{permission.role}</strong>
            <p>{permission.scope}</p>
          </article>
        ))}
      </div>

      {/* Add / Edit User Modal */}
      {(isAddModalOpen || editingUser) &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingTop: '60px',
              paddingBottom: '40px',
              overflowY: 'auto'
            }}
            onClick={() => {
              setIsAddModalOpen(false);
              setEditingUser(null);
            }}
          >
            <div
              className="panel panel-wide panel-elevated"
              style={{ maxWidth: 520, width: '100%', padding: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{currentTenant.companyName}</p>
                  <h3>{editingUser ? `${editingUser.name} Düzenle` : 'Yeni Kullanıcı Ekle'}</h3>
                </div>
                <button
                  className="mini-badge"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                >
                  ✕ Kapat
                </button>
              </div>

              <form onSubmit={editingUser ? handleSaveUserEdit : handleAddUserSubmit} style={{ display: 'grid', gap: 14 }}>
                <label className="select-field">
                  <span>Ad Soyad *</span>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Hasan Yılmaz"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>E-posta Adresi *</span>
                  <input
                    type="email"
                    required
                    placeholder="hasan@firma.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Telefon</span>
                  <input
                    type="text"
                    placeholder="0532 123 45 67"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  />
                </label>

                <label className="select-field">
                  <span>Sistem Rolü *</span>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="Firma Yöneticisi (Tenant Admin)">Firma Yöneticisi (Tenant Admin)</option>
                    <option value="CRM & Satış Yöneticisi">CRM & Satış Yöneticisi</option>
                    <option value="Teklif & Sözleşme Uzmanı">Teklif & Sözleşme Uzmanı</option>
                    <option value="Doküman & Arşiv Yöneticisi">Doküman & Arşiv Yöneticisi</option>
                    <option value="Finans & Muhasebe Sorumlusu">Finans & Muhasebe Sorumlusu</option>
                    <option value="İSG Uzmanı (A Sınıfı)">İSG Uzmanı (A Sınıfı)</option>
                    <option value="İSG Uzmanı (B Sınıfı)">İSG Uzmanı (B Sınıfı)</option>
                    <option value="İSG Uzmanı (C Sınıfı)">İSG Uzmanı (C Sınıfı)</option>
                    <option value="İşyeri Hekimi">İşyeri Hekimi</option>
                    <option value="Diğer Sağlık Personeli (DSP)">Diğer Sağlık Personeli (DSP)</option>
                    <option value="Müşteri Temsilcisi">Müşteri Temsilcisi</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Hesap Durumu</span>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value as 'Aktif' | 'Pasif' })}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Pasif">Pasif / Dondurulmuş</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Kullanıcı Türü & Sistem Erişimi *</span>
                  <select
                    value={userForm.userType || 'Sistem Kullanıcısı'}
                    onChange={(e) => setUserForm({ ...userForm, userType: e.target.value as any })}
                  >
                    <option value="Sistem Kullanıcısı">💻 Sistem Kullanıcısı (Şifre & Panel Erişimi Var)</option>
                    <option value="Saha / Danışman Kadro">📋 Saha / Danışman Kadro (Bilgi & Görevlendirme Amaçlı)</option>
                  </select>
                </label>


                <div className="new-customer-actions">
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingUser(null);
                    }}
                  >
                    İptal
                  </button>
                  <button type="submit" className="primary-action">
                    {editingUser ? 'Değişiklikleri Kaydet' : 'Kullanıcıyı Ekle & Davet Et'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* USER PASSWORD CREATION & FIRST LOGIN SIMULATION MODAL */}
      {passwordSetupUser &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingTop: '60px',
              paddingBottom: '40px',
              overflowY: 'auto'
            }}
            onClick={() => setPasswordSetupUser(null)}
          >
            <div
              className="panel panel-wide panel-elevated"
              style={{ maxWidth: 540, width: '100%', padding: 28, background: '#ffffff', color: '#1f2937' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 16px', borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 600 }}>
                  👁️ KULLANICI E-POSTA ŞİFRE BELİRLEME SİMÜLASYONU
                </span>
                <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setPasswordSetupUser(null)}>
                  ✕ Kapat
                </button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span className="brand-mark" style={{ display: 'inline-block', marginBottom: 8, fontSize: '1.4rem' }}>🔐</span>
                <h3 style={{ margin: '0 0 4px', color: '#111827' }}>Hoş Geldiniz, {passwordSetupUser.name}!</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280' }}>
                  {currentTenant.companyName} SaaS hesabınız için lütfen kendi şifrenizi belirleyin.
                </p>
              </div>

              <form onSubmit={handleSavePasswordSimulation} style={{ display: 'grid', gap: 16 }}>
                <div style={{ background: '#f9fafb', padding: 14, borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '0.84rem' }}>
                  <strong>Kullanıcı E-postası:</strong> {passwordSetupUser.email}<br />
                  <strong>Atanan Sistem Rolü:</strong> {passwordSetupUser.role}
                </div>

                <label className="select-field">
                  <span>Yeni Şifreniz *</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="En az 6 karakterli güçlü şifre"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                      style={{ paddingRight: 42, width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        padding: 4
                      }}
                      title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>

                <label className="select-field">
                  <span>Yeni Şifre (Tekrar) *</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Şifrenizi tekrar girin"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      style={{ paddingRight: 42, width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        padding: 4
                      }}
                      title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  style={{
                    padding: '14px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    marginTop: 6
                  }}
                >
                  ✅ Şifremi Kaydet & Sisteme Giriş Yap
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* SUPER ADMIN INVITATION & PASSWORD SETUP MODAL */}
      {superAdminInviteUser &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.78)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20
            }}
            onClick={() => setSuperAdminInviteUser(null)}
          >
            <div
              className="panel panel-wide panel-elevated"
              style={{ maxWidth: 540, width: '100%', padding: 28, background: '#ffffff', color: '#1f2937', borderRadius: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.6rem' }}>🛡️</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#6366f1' }}>SaaS Süper Admin Davet & Giriş Altyapısı</h3>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{superAdminInviteUser.name} ({superAdminInviteUser.email})</span>
                  </div>
                </div>
                <button className="mini-badge" style={{ cursor: 'pointer' }} onClick={() => setSuperAdminInviteUser(null)}>
                  ✕ Kapat
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.84rem' }}>
                  <strong style={{ color: '#1e293b', display: 'block', marginBottom: 4 }}>📌 Yeni Süper Admin Nasıl Giriş Yapacak?</strong>
                  <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
                    1. Süper Admin olarak tanımlanan kişiye özel aktivasyon linki e-posta ile otomatik iletilir.<br />
                    2. Linke tıklayan yeni Süper Admin, kendi güvenli şifresini belirler.<br />
                    3. Ardından <strong>https://app.osgb-sistem.com/login</strong> adresinden e-postası ve belirlediği şifresiyle sisteme giriş yapar.
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                    📋 Özel Aktivasyon & Şifre Belirleme Bağlantısı:
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      readOnly
                      value={`https://app.osgb-sistem.com/superadmin-invite?email=${encodeURIComponent(superAdminInviteUser.email)}&token=SA_MAGIC_${Math.random().toString(36).substring(2, 8)}`}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      style={{ padding: '8px 14px', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => {
                        const link = `https://app.osgb-sistem.com/superadmin-invite?email=${encodeURIComponent(superAdminInviteUser.email)}&token=SA_MAGIC_TOKEN_2026`;
                        navigator.clipboard?.writeText(link);
                        alert(`📋 Süper Admin Davet Bağlantısı Kopyalandı:\n\n${link}`);
                      }}
                    >
                      Kopyala
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    style={{ padding: '10px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                    onClick={() => {
                      setSuperAdminInviteUser(null);
                      setPasswordSetupUser({
                        id: `sa-user-${Date.now()}`,
                        tenantId: 'saas-system',
                        name: superAdminInviteUser.name,
                        email: superAdminInviteUser.email,
                        role: 'Süper Admin (Sistem Sahibi)',
                        phone: '0532 000 00 00',
                        status: 'Aktif',
                        userType: 'Sistem Kullanıcısı',
                        addedAt: new Date().toISOString().split('T')[0]
                      });
                    }}
                  >
                    🔑 İlk Giriş & Şifre Belirleme Ekranını Test Et →
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
