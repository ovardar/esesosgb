export const dashboardStats = [
  { label: 'Müşteri', value: '128', detail: 'Son 30 gün +12' },
  { label: 'Teklif', value: '42', detail: '8 onay bekliyor' },
  { label: 'Sözleşme', value: '31', detail: '4 yenileme yakında' },
  { label: 'Doküman', value: '209', detail: '19 taslak klasörde' }
];

export const customerSeeds = [
  {
    id: 'cust-1',
    name: 'Alfa OSGB Sanayi',
    status: 'Aktif',
    stage: 'Sözleşme',
    owner: 'Ayşe Yılmaz',
    city: 'İstanbul',
    district: 'Ataşehir',
    hazardClass: 'Tehlikeli',
    sector: 'Ağır sanayi',
    employeeCount: 1840,
    disabledEmployeeCount: 14,
    specialGroupsNotes: '14 engelli personel için engelsiz acil durum tahliye rotası ve özel ergonomik çalışma istasyonu planlandı.',
    contact: 'Murat Kara',
    phone: '0216 455 10 20',
    email: 'info@alfaosgb.com',
    taxNo: '1234567890',
    taxOffice: 'Ataşehir VD',
    naceCode: '28.11.01',
    website: 'https://alfaosgb.com',
    address: 'Barbaros Mah. Kardelen Sok. No:12 Ataşehir / İstanbul',
    service: 'İş güvenliği, eğitim ve sağlık hizmeti',
    offer: 'Teklif #124',
    contract: 'Sözleşme #45',
    note: 'Yenileme görüşmesi haftaya planlandı.',
    leadSource: 'Referans',
    requestedServices: ['İSG Uzmanı', 'İşyeri Hekimi', 'DSP (Diğer Sağlık Personeli)', 'Periyodik Kontroller & Ölçümler'],
    visitFrequency: 'Haftalık',
    locationCount: 3,
    shiftStructure: '3 Vardiya (24 Saat Kesintisiz)',
    expertClassNeed: 'B Sınıfı',
    doctorMonthlyHours: 307,
    expertMonthlyHours: 613,
    needsAnalysisNotes: '1840 çalışan için tam zamanlı 3 İSG uzmanı ve 2 işyeri hekimi görevlendirmesi talep ediliyor. Vardiyalı çalışma mevcuttur.',
    contactsList: [
      { id: 'cnt-1', name: 'Murat Kara', title: 'Genel Müdür', email: 'murat.kara@alfaosgb.com', phone: '0532 111 22 33', extension: '101', isPrimary: true, notes: 'Sözleşme imza yetkilisi' },
      { id: 'cnt-2', name: 'Selin Aras', title: 'İnteraktif İK Müdürü', email: 'selin.aras@alfaosgb.com', phone: '0533 222 33 44', extension: '105', isPrimary: false, notes: 'Hakkında periyodik rapor iletiliyor' }
    ],
    activitiesList: [
      { id: 'act-1', type: 'Ziyaret', date: '2026-07-20', time: '10:30', contactPerson: 'Murat Kara (Genel Müdür)', performedBy: 'Ayşe Yılmaz (A Sınıfı İSG Uzmanı)', owner: 'Ayşe Yılmaz', subject: 'Aylık Saha Denetimi ve Uzman Ziyareti', summary: 'Fabrika sahası incelendi, yangın tüpleri kontrol edildi ve İSG kurul kararları gözden geçirildi.', actionNote: 'Önümüzdeki hafta tatbikat raporu hazırlanacak.', status: 'Tamamlandı', reminderOffset: 'none' },
      { id: 'act-2', type: 'Toplantı', date: '2026-07-24', time: '14:00', contactPerson: 'Selin Aras (İK Müdürü)', performedBy: 'Ayşe Yılmaz (Müşteri Temsilcisi)', owner: 'Ayşe Yılmaz', subject: 'Yıllık Sözleşme Yenileme Görüşmesi', summary: '2026-2027 dönemi İSG ve Hekim süre hesaplamaları sunulacak.', actionNote: 'Revize fiyat teklifi toplantıya yetiştirilecek.', status: 'Planlandı', reminderOffset: '15m' }
    ],
    offers: ['Teklif #124 - Onayda', 'Teklif #119 - Arşiv'],
    contracts: ['Sözleşme #45 - Aktif', 'Ek Protokol #12 - Taslak']
  },
  {
    id: 'cust-2',
    name: 'Beta Lojistik A.Ş.',
    status: 'Teklif Bekliyor',
    stage: 'Teklif',
    owner: 'Mert Demir',
    city: 'Bursa',
    district: 'Nilüfer',
    hazardClass: 'Tehlikeli',
    sector: 'Lojistik depo',
    employeeCount: 520,
    disabledEmployeeCount: 6,
    specialGroupsNotes: '6 engelli çalışan için erişilebilir depo rampaları ve işitme cihazı destekli acil durum uyarı sistemleri talep ediliyor.',
    contact: 'Sena Aydın',
    phone: '0224 222 30 40',
    email: 'iletisim@betalojistik.com.tr',
    taxNo: '9876543210',
    taxOffice: 'Nilüfer VD',
    naceCode: '52.10.02',
    website: 'https://betalojistik.com.tr',
    address: 'Organize Sanayi Bölgesi 4. Cad. No:8 Nilüfer / Bursa',
    service: 'Mobil sağlık ve saha denetimi',
    offer: 'Teklif #131',
    contract: 'Taslak',
    note: 'Fiyat revizyonu sonrası onaya çıkacak.',
    leadSource: 'Web Sitesi',
    requestedServices: ['İSG Uzmanı', 'Mobil Sağlık Tarama', 'İlk Yardım Eğitimi'],
    visitFrequency: 'İki Haftada Bir',
    needsAnalysisNotes: 'Depo personeli için yılda 1 kez akciğer grafisi ve işitme testi taraması hedefleniyor.',
    contactsList: [
      { id: 'cnt-3', name: 'Sena Aydın', title: 'Operasyon Direktörü', email: 'sena.aydin@betalojistik.com', phone: '0535 444 55 66', extension: '201', isPrimary: true, notes: 'Fiyat pazarlıklarında tek yetkili' },
      { id: 'cnt-4', name: 'Ece Bulut', title: 'Satınalma Uzmanı', email: 'ece.bulut@betalojistik.com', phone: '0536 555 66 77', extension: '204', isPrimary: false, notes: 'Fatura ve ödeme işlemleri yetkilisi' }
    ],
    activitiesList: [
      { id: 'act-3', type: 'Telefon', date: '2026-07-22', time: '11:15', contactPerson: 'Sena Aydın (Operasyon Direktörü)', performedBy: 'Mert Demir (Satış Temsilcisi)', owner: 'Mert Demir', subject: 'Teklif İnceleme ve İskonto Talebi', summary: 'Sena Hanım mobil sağlık tıkında %5 özel indirim talep etti.', actionNote: 'Yönetim onayı alınıp yeni teklif iletilecek.', status: 'Tamamlandı' },
      { id: 'act-3b', type: 'Ziyaret', date: '2026-07-23', time: '11:00', contactPerson: 'Sena Aydın (Operasyon Direktörü)', performedBy: 'Mert Demir (Satış Temsilcisi)', owner: 'Mert Demir', subject: 'Depo İSG Denetimi ve Saha Görüşmesi', summary: 'Mobil sağlık aracı park yeri ve depo rampaları yerinde incelenecektir.', actionNote: 'Görüşme zamanı teyit edilecek.', status: 'Planlandı', reminderOffset: '15m' }
    ],
    offers: ['Teklif #131 - Hazırlanıyor', 'Teklif #128 - İade'],
    contracts: ['Taslak Sözleşme #7']
  },
  {
    id: 'cust-3',
    name: 'Gamma Enerji',
    status: 'Sözleşme Revizyonunda',
    stage: 'Görüşme',
    owner: 'Elif Kaya',
    city: 'Ankara',
    district: 'Çankaya',
    hazardClass: 'Çok Tehlikeli',
    sector: 'Enerji üretim',
    employeeCount: 760,
    disabledEmployeeCount: 9,
    specialGroupsNotes: '9 engelli personel santral idari binasında görev yapıyor. İletişim desteği sağlanıyor.',
    contact: 'Tolga Şen',
    phone: '0312 440 50 60',
    email: 'info@gammaenerji.com',
    taxNo: '4567891230',
    taxOffice: 'Çankaya VD',
    naceCode: '35.11.02',
    website: 'https://gammaenerji.com',
    address: 'Eskişehir Yolu 9. Km No:140 Çankaya / Ankara',
    service: 'Periyodik kontrol ve risk analizi',
    offer: 'Teklif #118',
    contract: 'Sözleşme #39',
    note: 'Ek protokol güncellemesi bekleniyor.',
    leadSource: 'Referans',
    requestedServices: ['İSG Uzmanı', 'İşyeri Hekimi', 'Patlamadan Korunma Dokümanı', 'Periyodik Kontroller & Ölçümler'],
    visitFrequency: 'Haftalık',
    needsAnalysisNotes: 'Yüksek gerilim ve patlayıcı ortam riskleri için uzman İSG desteği gerekiyor.',
    contactsList: [
      { id: 'cnt-5', name: 'Tolga Şen', title: 'Teknik Müdür', email: 'tolga.sen@gammaenerji.com', phone: '0537 666 77 88', extension: '302', isPrimary: true, notes: 'Saha denetimleri doğrudan Tolga Bey ile yürütülüyor' }
    ],
    activitiesList: [
      { id: 'act-4', type: 'Not', date: '2026-07-15', time: '09:30', contactPerson: 'Tolga Şen (Teknik Müdür)', performedBy: 'Elif Kaya (İSG Uzmanı & Danışman)', owner: 'Elif Kaya', subject: 'Patlamadan Korunma Dokümanı Sunumu', summary: 'Hazırlanan PKD taslağı yönetim kuruluna sunuldu.', actionNote: 'Revize maddeler sözleşmeye eklenecek.', status: 'Tamamlandı' }
    ],
    offers: ['Teklif #118 - Kazanıldı'],
    contracts: ['Sözleşme #39 - Revizyonda']
  },
  {
    id: 'cust-4',
    name: 'Delta Kimya',
    status: 'Aktif',
    stage: 'Sözleşme',
    owner: 'Ayşe Yılmaz',
    city: 'Kocaeli',
    district: 'Gebze',
    hazardClass: 'Çok Tehlikeli',
    sector: 'Üretim tesisi',
    employeeCount: 980,
    disabledEmployeeCount: 11,
    specialGroupsNotes: '11 engelli personel için sağlık taramaları periyodik hekim kontrolünde takip edilmektedir.',
    contact: 'Kerem Aksoy',
    phone: '0262 640 70 80',
    email: 'iletisim@deltakimya.com',
    taxNo: '7891234560',
    taxOffice: 'Gebze VD',
    naceCode: '20.14.01',
    website: 'https://deltakimya.com',
    address: 'Gebze Kimyacılar İhtisas OSB 2. Cad No:15 Gebze / Kocaeli',
    service: 'Kimyasal risk yönetimi',
    offer: 'Teklif #140',
    contract: 'Sözleşme #52',
    note: 'Aylık raporlama akışı başladı.',
    leadSource: 'Saha Ziyareti',
    requestedServices: ['İSG Uzmanı', 'İşyeri Hekimi', 'DSP (Diğer Sağlık Personeli)', 'Patlamadan Korunma Dokümanı', 'Risk Analizi', 'Acil Durum Planı'],
    visitFrequency: 'Haftalık',
    needsAnalysisNotes: 'Tehlikeli kimyasallar ve acil durum eylem planı güncellenmesi periyodik olarak kontrol ediliyor.',
    contactsList: [
      { id: 'cnt-6', name: 'Kerem Aksoy', title: 'Tesis Müdürü', email: 'kerem.aksoy@deltakimya.com', phone: '0538 777 88 99', extension: '401', isPrimary: true, notes: 'Fabrika genel sorumlusu' }
    ],
    activitiesList: [
      { id: 'act-5', type: 'Ziyaret', date: '2026-07-21', time: '13:00', contactPerson: 'Kerem Aksoy (Tesis Müdürü)', performedBy: 'Ayşe Yılmaz (İSG Başuzmanı)', owner: 'Ayşe Yılmaz', subject: 'Aylık Kimyasal Depo Ziyareti', summary: 'Depo havalandırma sistemleri ve MSDS formları kontrol edildi.', actionNote: 'Eksik etiketler için uyarı notu düşüldü.', status: 'Tamamlandı' }
    ],
    offers: ['Teklif #140 - Aktif'],
    contracts: ['Sözleşme #52 - Aktif']
  }
];

export const documentSeeds: import('../types').DocumentRecord[] = [
  {
    id: 'doc-1',
    title: 'Alfa OSGB 2026-2027 Islak İmzalı Hizmet Sözleşmesi',
    fileName: 'Alfa_OSGB_Sanayi_SZL-2026-001_Imzali.pdf',
    fileSize: '4.8 MB',
    fileType: 'PDF',
    category: 'Sözleşme',
    customerName: 'Alfa OSGB Sanayi',
    linkedContractNo: 'SZL-2026-001',
    linkedOfferNo: 'TKL-2026-001',
    uploadDate: '2026-07-20',
    uploadedBy: 'Ayşe Yılmaz',
    status: 'Onaylandı / Bağlandı',
    matchConfidence: 100,
    notes: 'Taraflarca karşılıklı imzalanmış ana sözleşme aslı.'
  },
  {
    id: 'doc-2',
    title: 'Beta Lojistik 2026 Fiyat Zam Ek Protokolü (Rev 1)',
    fileName: 'Beta_Lojistik_Ek_Protokol_Rev1.pdf',
    fileSize: '1.2 MB',
    fileType: 'PDF',
    category: 'Ek Protokol / Revizyon',
    customerName: 'Beta Lojistik A.Ş.',
    linkedContractNo: 'SZL-2026-002',
    uploadDate: '2026-07-22',
    uploadedBy: 'Mert Demir',
    status: 'Onaylandı / Bağlandı',
    matchConfidence: 100,
    notes: '2026 ÜFE oranında fiyat güncelleme zammı ek protokolü.'
  },
  {
    id: 'doc-3',
    title: 'Delta Kimya Patlamadan Korunma Dokümanı (PKD)',
    fileName: 'Delta_Kimya_PKD_Raporu_2026.pdf',
    fileSize: '12.4 MB',
    fileType: 'PDF',
    category: 'Saha & Risk Analiz Raporu',
    customerName: 'Delta Kimya Tesisleri A.Ş.',
    linkedContractNo: 'SZL-2026-003',
    uploadDate: '2026-07-18',
    uploadedBy: 'Ayşe Yılmaz',
    status: 'Onaylandı / Bağlandı',
    matchConfidence: 95,
    notes: 'A Sınıfı uzman onaylı patlamadan korunma saha analiz dokümanı.'
  },
  {
    id: 'doc-4',
    title: 'Gezici Mobil Sağlık Akciğer Grafisi ve Odyo Sonuçları (Toplu)',
    fileName: 'Gezici_Saglik_Tarama_Toplu_Rapor_2026_07.pdf',
    fileSize: '8.1 MB',
    fileType: 'PDF',
    category: 'Sağlık Muayene Formu',
    customerName: 'Alfa OSGB Sanayi',
    uploadDate: '2026-07-21',
    uploadedBy: 'Mert Demir',
    status: 'İmza Bekliyor',
    matchConfidence: 85,
    notes: 'İşyeri hekimi ıslak imzası tamamlandıktan sonra onaylanacak.'
  },
  {
    id: 'doc-5',
    title: 'Görüşme İmzalı İhtiyaç Analiz Formu (Gelen Evrak)',
    fileName: 'SCAN_20260723_00912.pdf',
    fileSize: '3.4 MB',
    fileType: 'PDF',
    category: 'Teklif Dokümanı',
    uploadDate: '2026-07-23',
    uploadedBy: 'Sistem Yükleme Motoru',
    status: 'Eşleşmedi / Havuzda',
    matchConfidence: 0,
    notes: 'Toplu yükleme havuzunda eşleştirme bekliyor.'
  },
  {
    id: 'doc-6',
    title: '2025 Yılı Arşiv Sözleşmesi (Eski Sistemden Aktarılan)',
    fileName: 'Eski_Sistem_Sozlesme_2025_Arsiv.pdf',
    fileSize: '2.9 MB',
    fileType: 'PDF',
    category: 'Sözleşme',
    customerName: 'Beta Lojistik A.Ş.',
    uploadDate: '2026-07-15',
    uploadedBy: 'Toplu Aktarım Botu',
    status: 'Arşiv',
    matchConfidence: 100,
    notes: 'Geçmiş döneme ait tamamlanmış arşiv belgesi.'
  }
];

export const permissionSeeds = [
  { role: 'Süper Admin', access: 'Tam Yetki', scope: 'Tüm SaaS kiracıları ve sistem ayarları' },
  { role: 'Tenant Admin', access: 'Firma Yöneticisi', scope: 'Firma içi tüm CRM, teklif ve sözleşmeler' },
  { role: 'Müşteri Temsilcisi', access: 'Operasyonel', scope: 'Kendi müşterileri ve teklif akışları' },
  { role: 'İSG Uzmanı / Hekim', access: 'Saha Yetkisi', scope: 'Dokümanlar ve saha aktivite kayıtları' }
];

export const priceListSeeds = [
  { status: 'Aktif', version: '2026 v1.2 Standart Liste', note: '2026 yılı enflasyon güncellemeli fiyat listesi', effectiveDate: '01.01.2026' },
  { status: 'Arşiv', version: '2025 v2.0 Kurumsal Liste', note: 'Geçen yıla ait özel kurumsal paket teklif listesi', effectiveDate: '15.03.2025' }
];

export const priceItemSeeds = [
  { item: 'İSG Uzmanı (A/B/C Sınıfı)', unit: 'Saat / Ay', price: '₺350 / Saat' },
  { item: 'İşyeri Hekimi Hizmeti', unit: 'Saat / Ay', price: '₺500 / Saat' },
  { item: 'DSP (Diğer Sağlık Personeli)', unit: 'Saat / Ay', price: '₺220 / Saat' },
  { item: 'Mobil Sağlık Akciğer Grafisi', unit: 'Kişi Başı', price: '₺180 / Kişi' },
  { item: 'İlk Yardım Eğitimi', unit: 'Kişi Başı', price: '₺450 / Kişi' }
];

export const offerSeeds: import('../types').OfferRecord[] = [
  {
    id: 'off-1',
    offerNo: 'TKL-2026-001',
    customerName: 'Alfa OSGB Sanayi',
    subject: '2026-2027 Yıllık İSG Uzmanı & Hekim Hizmet Teklifi',
    status: 'Gönderildi',
    currentRevisionNo: 2,
    createdDate: '2026-07-15',
    validUntilDate: '2026-08-15',
    owner: 'Ayşe Yılmaz',
    revisions: [
      {
        revisionNo: 0,
        revisionDate: '2026-07-15 10:00',
        preparedBy: 'Ayşe Yılmaz',
        revisionNotes: 'İlk taslak teklif oluşturuldu.',
        services: [
          { id: 's1', serviceName: 'İSG Uzmanı', unit: 'Saat/Ay', quantity: 613, unitPrice: 380, kdvPercent: 20, lineTotal: 232940 },
          { id: 's2', serviceName: 'İşyeri Hekimi', unit: 'Saat/Ay', quantity: 307, unitPrice: 420, kdvPercent: 20, lineTotal: 128940 },
          { id: 's3', serviceName: 'DSP (Diğer Sağlık Personeli)', unit: 'Aylık', quantity: 1, unitPrice: 25000, kdvPercent: 20, lineTotal: 25000 }
        ],
        subtotal: 386880,
        discountTotal: 0,
        taxAmount: 77376,
        grandTotal: 464256
      },
      {
        revisionNo: 1,
        revisionDate: '2026-07-18 14:30',
        preparedBy: 'Ayşe Yılmaz',
        revisionNotes: 'Selin Hanım ile yapılan görüşme sonrası İSG Uzmanı saatlik ücretine %5 iskonto uygulandı.',
        services: [
          { id: 's1', serviceName: 'İSG Uzmanı', unit: 'Saat/Ay', quantity: 613, unitPrice: 380, kdvPercent: 20, lineTotal: 221293 },
          { id: 's2', serviceName: 'İşyeri Hekimi', unit: 'Saat/Ay', quantity: 307, unitPrice: 420, kdvPercent: 20, lineTotal: 128940 },
          { id: 's3', serviceName: 'DSP (Diğer Sağlık Personeli)', unit: 'Aylık', quantity: 1, unitPrice: 25000, kdvPercent: 20, lineTotal: 25000 }
        ],
        subtotal: 386880,
        discountTotal: 11647,
        taxAmount: 75047,
        grandTotal: 450280
      },
      {
        revisionNo: 2,
        revisionDate: '2026-07-22 16:00',
        preparedBy: 'Ayşe Yılmaz',
        revisionNotes: 'Periyodik ölçüm paketi hediye kalem olarak teklife dahil edildi (Rev 2 - Son Sürüm).',
        services: [
          { id: 's1', serviceName: 'İSG Uzmanı', unit: 'Saat/Ay', quantity: 613, unitPrice: 380, kdvPercent: 20, lineTotal: 221293 },
          { id: 's2', serviceName: 'İşyeri Hekimi', unit: 'Saat/Ay', quantity: 307, unitPrice: 420, kdvPercent: 20, lineTotal: 128940 },
          { id: 's3', serviceName: 'DSP (Diğer Sağlık Personeli)', unit: 'Aylık', quantity: 1, unitPrice: 25000, kdvPercent: 20, lineTotal: 25000 },
          { id: 's4', serviceName: 'Periyodik Kontroller & Ölçümler', unit: 'Paket', quantity: 1, unitPrice: 15000, kdvPercent: 0, lineTotal: 0 }
        ],
        subtotal: 401880,
        discountTotal: 26647,
        taxAmount: 75047,
        grandTotal: 450280
      }
    ]
  },
  {
    id: 'off-2',
    offerNo: 'TKL-2026-002',
    customerName: 'Alfa OSGB Sanayi',
    subject: 'Mobil Sağlık Tarama & Yıllık Akciğer Grafisi Paketi',
    status: 'Revizyon İstendi',
    currentRevisionNo: 1,
    createdDate: '2026-07-19',
    validUntilDate: '2026-08-19',
    owner: 'Ayşe Yılmaz',
    revisions: [
      {
        revisionNo: 0,
        revisionDate: '2026-07-19 11:00',
        preparedBy: 'Ayşe Yılmaz',
        revisionNotes: '1840 personel için sahada mobil gezici İSG aracı ile sağlık taraması teklifi.',
        services: [
          { id: 'ms1', serviceName: 'Mobil Sağlık Tarama (Akciğer & Odyo)', unit: 'Kişi/Ay', quantity: 1840, unitPrice: 120, kdvPercent: 20, lineTotal: 220800 }
        ],
        subtotal: 220800,
        discountTotal: 0,
        taxAmount: 44160,
        grandTotal: 264960
      },
      {
        revisionNo: 1,
        revisionDate: '2026-07-21 15:45',
        preparedBy: 'Ayşe Yılmaz',
        revisionNotes: 'Sena Hanım kişi başı birim fiyatta %10 indirim talep etti, revize ediliyor.',
        services: [
          { id: 'ms1', serviceName: 'Mobil Sağlık Tarama (Akciğer & Odyo)', unit: 'Kişi/Ay', quantity: 1840, unitPrice: 120, kdvPercent: 20, lineTotal: 198720 }
        ],
        subtotal: 220800,
        discountTotal: 22080,
        taxAmount: 39744,
        grandTotal: 238464
      }
    ]
  },
  {
    id: 'off-3',
    offerNo: 'TKL-2026-003',
    customerName: 'Beta Lojistik A.Ş.',
    subject: 'Lojistik Depo İSG Uzmanı & İlk Yardım Eğitimi Paketi',
    status: 'Onay Bekliyor',
    currentRevisionNo: 0,
    createdDate: '2026-07-20',
    validUntilDate: '2026-08-20',
    owner: 'Mert Demir',
    revisions: [
      {
        revisionNo: 0,
        revisionDate: '2026-07-20 09:30',
        preparedBy: 'Mert Demir',
        revisionNotes: 'İlk teklif sunuldu.',
        services: [
          { id: 'bs1', serviceName: 'İSG Uzmanı (B Sınıfı)', unit: 'Saat/Ay', quantity: 173, unitPrice: 380, kdvPercent: 20, lineTotal: 65740 },
          { id: 'bs2', serviceName: 'İlk Yardım Eğitimi', unit: 'Adet', quantity: 25, unitPrice: 1200, kdvPercent: 20, lineTotal: 28500 }
        ],
        subtotal: 95740,
        discountTotal: 1500,
        taxAmount: 18848,
        grandTotal: 113088
      }
    ]
  }
];