import type { SectionId } from '../types';

export const sections: Array<{ id: SectionId; label: string; description: string }> = [
  { id: 'dashboard', label: '📊 Ana Sayfa (Pano)', description: 'Genel bakış, finansal KPI ve operasyonel ajanda' },
  { id: 'customers', label: '🏢 Müşteriler', description: 'Firma kartları ve müşteri ilişkileri' },
  { id: 'offers', label: '📑 Teklifler', description: 'Revizyonlu teklif ve onay akışı' },
  { id: 'contracts', label: '📜 Sözleşmeler', description: 'Hizmet sözleşmeleri ve yenilemeler' },
  { id: 'price-lists', label: '🏷️ Fiyat Listeleri', description: 'Fiyat şablonları ve paket setleri' },
  { id: 'documents', label: '📂 Dokümanlar', description: 'Doküman kütüphanesi ve versiyonlar' },
  { id: 'saas-admin', label: '🧩 SaaS Yönetimi', description: 'Kiracı firmalar, lisanslar ve abonelikler' },
  { id: 'settings', label: '⚙️ Sistem Ayarları', description: 'Tema ayarları, Kullanıcı Yetkileri ve Veri Aktarımı' }
];
