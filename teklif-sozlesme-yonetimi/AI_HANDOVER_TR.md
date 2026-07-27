# Teklif ve Sozlesme Yonetimi - AI Handover Dokumani

## 1) Bu dokumanin amaci
Bu dokuman, yeni olusturulan standalone CRM uygulamasinda su ana kadar yapilan tum isi, baska bir yapay zekanin hizli ve dogru sekilde devralabilmesi icin teknik ve operasyonel olarak aciklar.

Hedef:
- Eski osgb-sistem uygulamasina dokunmadan,
- yeni bir alt proje icinde,
- teklif/sozlesme merkezli CRM deneyimini ayri bir urun gibi ilerletmek.

## 2) Kapsam ve repo yerlesimi
Ana repo:
- osgb-sistem

Yeni standalone uygulama:
- teklif-sozlesme-yonetimi

Bu yeni uygulama React + TypeScript + Vite ile calisir. Eski sistemdeki HTML ekranlari referans alinmistir, birebir kopya degil; modern moduler bir yapiya tasinmistir.

## 3) Kullanici taleplerinin evrimi (ozet)
Baslangictan bugune kadar gelen ana istekler:
1. CRM kismini ayri bir uygulamaya bolmek.
2. Minimalist ve sik bir tasarim dili kurmak.
3. Tema/palet degistirilebilir yapmak.
4. Tum ekranlari canli gorulebilir hale getirmek.
5. Musteri ekranini karttan cok filtreli/sirali tek tablo modeline cevirmek.
6. Satirdan musteri secince detay sayfasi ve sekmeli akis sunmak.
7. Renk paleti ayarini sadece kontrol panelinde gostermek.
8. Alan modelinde calisan sinifi yerine sektor + calisan sayisi kullanmak.
9. Ozet kartlari tek satir compact duzende sunmak.
10. Tabloda kolon bazli sort destegi eklemek.
11. Yeni Musteri Ekle formunu eski sistemdeki alan mantigina yaklastirmak.
12. NACE listesini gercek kaynaktan buyutmek.
13. Kaydetme islemini local state yerine Supabase backendine baglamak.

## 4) Mevcut teknik yapi
### 4.1 Uygulama cekirdegi
- [src/App.tsx](src/App.tsx)
  - Section tabanli ekran gecisi (dashboard, customers, offers, contracts, documents, price-lists, permissions, settings)
  - Tema state yonetimi
  - Tema secimini localStorage uzerinden kalici tutma
  - Dashboard ekranina tema degistirme yetkisi verme

- [src/components/Shell.tsx](src/components/Shell.tsx)
  - Sidebar + Hero + icerik alani
  - Sol menu ve aktif bolum gostergesi
  - Aktif tema bilgisini bilgilendirme karti olarak gosterme

### 4.2 Sayfa modulasyonu
- [src/components/pages/DashboardPage.tsx](src/components/pages/DashboardPage.tsx)
  - Panel metrikleri ve aktivite ozeti
  - Tema secim kontrolu sadece bu sayfada

- [src/components/pages/SettingsPage.tsx](src/components/pages/SettingsPage.tsx)
  - Bilgilendirme amacli sade sayfa
  - Tema secimi bu sayfadan kaldirilmis durumda

- [src/components/pages/CustomersPage.tsx](src/components/pages/CustomersPage.tsx)
  - En kritik ve en fazla gelistirilen ekran
  - Tablo + coklu filtre + kolon bazli sort
  - Detay gorunumu + sekmeler
  - Yeni musteri formu + validasyon + asama/durum kurallari
  - Supabase read/insert baglantisi
  - NACE kodu icin backend arama ve oneri

### 4.3 Veri ve konfig dosyalari
- [src/data/navigation.ts](src/data/navigation.ts)
  - Sol menudeki section metadata

- [src/data/theme.ts](src/data/theme.ts)
  - Tema listesi (ivory, graphite, sage, sand)

- [src/data/workbench.ts](src/data/workbench.ts)
  - Seed/mock datasetler
  - Not: CustomersPage backend verisi yukleyince seed verinin ustune geciyor

- [src/types.ts](src/types.ts)
  - SectionId ve ThemeId tipleri

- [src/styles.css](src/styles.css)
  - Temalar (CSS variable tabanli)
  - Layout, tablo, form, detail, sekme ve panel stilleri

## 5) Supabase entegrasyonu
### 5.1 Client kurulumu
- [src/lib/supabase.ts](src/lib/supabase.ts)
  - createClient ile Supabase baglantisi
  - auth ayarlari: detectSessionInUrl, persistSession, autoRefreshToken

Kullanilan URL/key, eski sistemdeki su dosyadan alinmistir:
- [../js/supabase-config.js](../js/supabase-config.js)

### 5.2 Kimlik/tenant baglami
CustomersPage acilisinda akis:
1. Supabase session alinir.
2. Session email ile osgb_staff tablosundan tenant_id cekilir.
3. tenant_id ile crm_leads tablosu filtrelenerek musteri listesi yuklenir.

Bu nedenle aktif oturum + dogru staff kaydi olmadan insert/read islevleri sinirli calisir.

### 5.3 NACE gercek kaynak kullanimi
NACE arama artik local sabit listeden degil:
- nace_codes tablosundan
- nace_code ve description alanlarinda ilike arama
- Sonuclardan danger_class bilgisi de cekilerek tehlike sinifi oneriye donusturuluyor

### 5.4 Yeni musteri kaydetme
Yeni musteri formu submit akisi:
1. Zorunlu alan validasyonu
2. Stage-status uyumluluk kontrolu
3. Form -> crm_leads payload map
4. Supabase insert
5. Basarili kayitta listeye prepend ve detay secimi

Kullanilan temel alan mapi:
- tenant_id <- authContext.tenantId
- company_name <- form.name
- city <- form.city
- district <- form.district
- sector <- form.sector
- nace_code <- form.naceCode
- danger_class <- form.hazardClass
- employee_count <- form.employeeCount
- stage <- stageToDbValue(form.stage)
- lead_status <- normalizedStatus
- lead_source <- form.leadSource
- assigned_to <- owner eger e-posta formatinda ise
- notes <- form.notes
- created_by <- authContext.email

## 6) Eski sistemden tasinan davranis kurallari
Referans ekran:
- [../crm.html](../crm.html)

Tasimanin ana kurallari:
1. Stage normalize/mapping mantigi
   - UI tarafinda Yeni Kayit/Gorusme/Teklif/Sozlesme
   - DB tarafinda legacy stage degerleri
2. lead_status semantigi
   - Firsat, Islemde, Kazanildi, Kaybedildi, Askida
3. NACE kodundan tehlike sinifi onerisi
4. Yeni lead insert kolonlari ve isimleri

## 7) Musteri sayfasi - mevcut kapasite
Musteri listesi ekrani:
- Tek tablo modeli
- Coklu filtre:
  - Arama
  - Durum
  - Sehir
  - Ilce
  - Tehlike sinifi
  - Sektor
- Kolon bazli siralama:
  - Firma
  - Durum
  - Sehir/Ilce
  - Tehlike
  - Sektor
  - Calisan sayisi
  - Sorumlu

Detay akisi:
- Satir secimi ile detay moduna gecis
- Sekmeler:
  - Firma bilgileri
  - Iletisim kisileri
  - Aktiviteler
  - Teklifler
  - Sozlesmeler

Yeni musteri formu:
- Legacy alana yakin form yapisi
- Asama/durum kurali
- NACE suggestion
- Backend insert

## 8) Tasarim sistemi ve tema davranisi
- CSS variable tabanli tema mimarisi
- Tema secimi sadece Dashboard ekraninda yapiliyor
- Secim localStorage uzerinden kalici
- Settings sayfasi bilgilendirme rolunde

## 9) Build ve calisma durumu
Son dogrulama:
- npm install: basarili
- npm run build: basarili
- TypeScript/Vite build hatasi yok

Calistirma komutlari (yeni app klasorunde):
1. npm install
2. npm run dev
3. npm run build

## 10) Bilinen eksikler / teknik borc
1. Supabase URL ve key su an kod icinde sabit
   - Tercihen .env (VITE_SUPABASE_URL, VITE_SUPABASE_KEY) ile tasinmali

2. Owner alani serbest metin
   - E-posta formatinda degilse assigned_to null yaziliyor
   - Daha iyi cozum: osgb_staff listesinden dropdown secim

3. Metrik kartlarinda status etiketleri
   - Mevcut filtre status degerleri backend lead_status ile tam ayni degil
   - Kart metrikleri backend status enumuna gore normalize edilmeli

4. Müşteri detail sekmeleri placeholder agirlikli
   - contacts/activities/offers/contracts su an liste bazli gorsel sunumda
   - Bir sonraki asama: crm_activities, crm_offers, crm_contracts gibi tablolardan canli cekim

5. Seed fallback davranisi
   - Session veya tenant bulunamazsa seed data gorunebilir
   - Prod senaryosunda bu fallback policy netlestirilmeli

## 11) Son yapilan kritik degisiklikler (en guncel)
1. NACE suggestion local katalogdan cikarildi, nace_codes tablosuna baglandi.
2. Yeni musteri kaydetme local state insert yerine crm_leads insert olarak degistirildi.
3. CustomersPage acilisinda tenant bazli crm_leads load eklendi.
4. Supabase client dosyasi eklendi.
5. package.json icine @supabase/supabase-js eklendi.

## 12) Diger AI icin hizli devralma talimati
Yeni AI, ise su sirayla baslamali:
1. Bu dosyayi tam oku.
2. [src/components/pages/CustomersPage.tsx](src/components/pages/CustomersPage.tsx) akisini bastan sona incele.
3. [src/lib/supabase.ts](src/lib/supabase.ts) ve [../js/supabase-config.js](../js/supabase-config.js) degerlerini karsilastir.
4. Gelistirme ortamini acip npm run dev ile UI akisini test et.
5. Yeni musteri ekleme, filtreleme ve detay gecisi akisini manuel dogrula.

Sonra oncelik verilecek isler:
1. Supabase key/env hardcode temizligi
2. owner icin staff dropdown entegrasyonu
3. detail sekmelerini canli tablolara baglama
4. status metriklerinin backend enum ile tam uyumlu hale getirilmesi

## 13) Kabul kriterleri (bir sonraki iterasyon icin)
1. Her yeni musteri olusturma denemesi crm_leads tablosuna gercek insert atiyor olmali.
2. NACE arama en az 2 karakterde nace_codes uzerinden sonuc dondurmeli.
3. Tenant izolasyonu bozulmamali; sadece aktif tenant verisi listelenmeli.
4. Theme secimi sadece dashboardda degismeli ve localStorage ile korunmali.
5. Build komutu hatasiz tamamlanmali.

---
Son guncelleme: 2026-07-23
Dokuman dili: Turkce
Hedef okuyucu: projeyi devralacak teknik AI ajanlari ve gelistiriciler
