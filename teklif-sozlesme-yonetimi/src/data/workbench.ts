export const dashboardStats = [
  { label: 'Müşteri', value: '0', detail: 'Aktif Müşteri Kaydı Yok' },
  { label: 'Teklif', value: '0', detail: 'Teklif Bulunmuyor' },
  { label: 'Sözleşme', value: '0', detail: 'Sözleşme Bulunmuyor' },
  { label: 'Doküman', value: '0', detail: 'Doküman Bulunmuyor' }
];

export const customerSeeds: any[] = [];

export const documentSeeds: any[] = [];

export const permissionSeeds = [
  { id: 'perm-1', role: 'Süper Admin (Sistem Sahibi)', userCount: 1, access: 'Tam Yetki', scope: 'Sistem Geneli', description: 'Tüm SaaS kiracılarını yönetme, lisans paketleri tanımlama, fiyatlandırma ve yetkilendirme erişimi.', color: '#6366f1' },
  { id: 'perm-2', role: 'Admin / Yönetici', userCount: 0, access: 'Firma İçi Yönetim', scope: 'Şirket İçi', description: 'Müşteri kartları, teklif hazırlama, sözleşme oluşturma, onay süreçleri ve personel atamalarında tam yetki.', color: '#3b82f6' },
  { id: 'perm-3', role: 'İSG Uzmanı', userCount: 0, access: 'Operasyonel', scope: 'Saha Yetkisi', description: 'Kendisine atanan müşterilerin acil durum planı, risk değerlendirmesi, ziyaret kayıtları ve saha raporlarına erişim.', color: '#10b981' },
  { id: 'perm-4', role: 'İşyeri Hekimi', userCount: 0, access: 'Sağlık Muayene', scope: 'Saha Yetkisi', description: 'İşyeri hekimi görevlendirmeleri, periyodik muayene listeleri, sağlık tarama sonuçları ve Hekim onay alanları.', color: '#f59e0b' },
  { id: 'perm-5', role: 'Teklif & CRM Sorumlusu', userCount: 0, access: 'Satış & CRM', scope: 'CRM Modülü', description: 'Yeni müşteri adayları (lead) ekleme, ihtiyaç analizi, teklif taslağı hazırlama ve müşteri görüşme takipleri.', color: '#8b5cf6' }
];

export const priceListSeeds: any[] = [];

export const priceItemSeeds: any[] = [];

export const offerSeeds: import('../types').OfferRecord[] = [];