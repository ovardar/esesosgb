import type { ThemeId } from '../types';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  label: string;
  summary: string;
  preview: string;
  mode: 'light' | 'dark';
}

export const themes: ThemeMeta[] = [
  // 6 LIGHT PALETTES
  { id: 'ivory', name: 'Ivory Nötr', label: 'Minimal default', summary: 'Açık, sakin ve nötr krem tonları.', preview: '#f5f3ef', mode: 'light' },
  { id: 'sage', name: 'Sage Green', label: 'Adaçayı yeşili', summary: 'Doğal, dinlendirici yeşil ve taş tonları.', preview: '#edf4ee', mode: 'light' },
  { id: 'sand', name: 'Sand Warm', label: 'Sıcak kumsal', summary: 'Krem ve doğal çöl kumları.', preview: '#f5efe3', mode: 'light' },
  { id: 'emerald', name: 'Emerald', label: 'Zümrüt ferahlığı', summary: 'Modern zümrüt yeşili ve açık zemin.', preview: '#e6f4ea', mode: 'light' },
  { id: 'nordic', name: 'Nordic Blue', label: 'Kuzey mavisi', summary: 'Ferah kurumsal açık mavi tonları.', preview: '#eef2ff', mode: 'light' },
  { id: 'rose', name: 'Rose Gold', label: 'Gül kurusu', summary: 'Zarif, sıcak gül kurusu ve pudra tonları.', preview: '#fff1f2', mode: 'light' },

  // 6 ULTRA-SLEEK DARK PALETTES (YÜKSEK KONTRASTLI CANLI KOYU TEMALAR)
  { id: 'graphite', name: 'Graphite Dark', label: 'Koyu gece & krom', summary: 'Canlı beyaz metin ve krom kontrast.', preview: '#111827', mode: 'dark' },
  { id: 'midnight', name: 'Midnight Indigo', label: 'Gece mavisi & indigo', summary: 'Derin lacivert zemin ve parlak mavi.', preview: '#0f172a', mode: 'dark' },
  { id: 'obsidian', name: 'Obsidian Copper', label: 'Andezit koyu gri & amber turuncu', summary: 'Şık andezit koyu gri zemin ve canlı amber turuncusu detaylar.', preview: '#1e2025', mode: 'dark' },
  { id: 'deepcyan', name: 'Deep Ocean Cyan', label: 'Okyanus mavi & turkuaz', summary: 'Okyanus mavisi ve canlı turkuaz ışıltı.', preview: '#0b192c', mode: 'dark' },
  { id: 'emeralddark', name: 'Emerald Dark', label: 'Karanlık zümrüt', summary: 'Derin orman siyahı ve neyron zümrüt.', preview: '#062016', mode: 'dark' },
  { id: 'violetdark', name: 'Vampire Violet', label: 'Karanlık mor & neon', summary: 'Derin mor gece zemini ve neon menekşe.', preview: '#180e29', mode: 'dark' }
];
