# SaaS Yönetim Sayfası — Kapsamlı Analiz Raporu

## 🔴 KRİTİK HATALAR (Düzeltilmeli)

### 1. Çifte `fetchCloudTenants` Fonksiyon Çakışması (Satır 171)
`SaaSAdminPage.tsx` içinde `useEffect` bloğunda **yerel** bir `fetchCloudTenants` fonksiyonu tanımlanmış. Aynı isimde bir fonksiyon `cloudDb.ts`'den de import ediliyor (satır 30). İçerideki yerel fonksiyon **çok farklı bir şey yapıyor**: Doğrudan Supabase'den ham veri çekip, her kiracıya sabit "Sistem Yetkilisi" ve "info@codentra.com.tr" bilgileri atıyor. Bu durum şu sorunlara yol açıyor:
- Siz Supabase'e gerçek bir kiracı eklediğinizde, bilgiler `contactName` ve `email` alanları yerine sabit değerlerle geliyor.
- Bu yerel fonksiyon, `cloudDb.ts`'deki gerçek `fetchCloudTenants`'ı tamamen gölgeliyor.

### 2. `handleGenerateMonthlyInvoices` — Sabit Ay Adı (Satır 599)
```js
const currentMonthName = 'Ağustos 2026'; // HARDCODED!
```
Ay adı sabit kodlanmış. Eylül, Ekim vs. gelindiğinde yanlış fatura kesilir.

### 3. Yeni Kiracı Ekle Modalı — Dışarı Tıklayınca Kapanıyor (Satır 3005)
Düzenle modalının `onClick` kapanması kaldırıldı ama "**Yeni Kiracı Ekle**" modalı hâlâ `onClick={() => setIsAddModalOpen(false)}` ile kapanıyor (satır 3005). Form doldurup yanlışlıkla arka plana basarsanız her şey siliniyor.

### 4. Teklif Sunma — "Gönderildi" Durumuna Anında Geçiş (Satır 659-665)
`handleSendOfferEmail` fonksiyonu yalnızca `alert()` gösteriyor, gerçek bir e-posta göndermeden önce teklif durumunu `Gönderildi` yapıyor. Yanlış tıklamada geri alınamaz.

### 5. Lisans Düzenleme Modalı — Dışarı Tıklayınca Kapanıyor (Satır 2452)
`editingLicenseTenant` modalı da overlay tıklamasıyla kapanıyor. Uzun fiyat-anlaşma notları girerken dışarı tıklarsanız her şey siliniyor.

---

## 🟡 ORTA ÖNCELİKLİ SORUNLAR

### 6. "Askıya Al / Aktife Al" Butonu — Pasif Durumu Yanlış (Satır 1024)
`handleToggleTenantStatus` fonksiyonu durum döngüsünü yalnızca **Aktif ↔ Askıda** arasında yapıyor:
```js
const newStatus = tenant.status === 'Aktif' ? 'Askıda' : 'Aktif';
```
Eğer kiracı `Demo`, `Aday` veya `İptal` durumundaysa butona basınca otomatik olarak `Aktif` yapılıyor — bu istenmez. Tablo sütununda buton etiketi de çakışıyor: Aktif olmayan her kiracıya `▶ Aktife Al` gösteriyor, oysa `Aday` olanlar için bu anlamsız.

### 7. `paymentFilter` Filtresi — Kullanılmıyor (Satır 310, 484)
`paymentFilter` state'i tanımlanmış ve `filteredTenants`'ta kullanılıyor ama sayfada **hiç filtre UI elementi yok**. Kullanıcı ödeme durumuna göre filtreleme yapamıyor.

### 8. Sözleşme Tablosunda Aksiyon Butonu Yok
Sözleşmeler (`sortedContracts`) listesinde her satır için hiçbir aksiyon yok. PDF indirme, iptal etme, ya da yenileme gibi işlemler yapılamıyor.

### 9. Fatura Ay Filtresi — Ağustos 2026 Eksik (Satır 1866-1871)
Fatura sekme filtresi Temmuz 2026'ya kadar seçenek sunuyor ama `handleGenerateMonthlyInvoices` **Ağustos 2026** adıyla fatura kesiyor. Bu faturaları filtreler göremiyor.

### 10. Lisans Düzenleme — Ücret Alanları Conditional Render (Satır 2520-2552)
`licenseEditForm` (Pazarlık modalı) ücret alanları hâlâ **tek input gösterir** mantığıyla çalışıyor. Yeni Kiracı Ekle ve Düzenle formlarında her iki alan birden gösterilip biri disable ediliyor; burada eski yöntem var. Tutarsızlık.

### 11. `selectedTenant` Detay — Modül Toggle Edilemiyor
Modül sekmesinde (satır 2868-2894) kiracının modülleri gösteriliyor ama **düzenleme imkânı yok**. Sadece okuma var. Değiştirmek için ayrı "Pazarlık Güncelle" ekranına geçmek gerekiyor.

### 12. Notlar Sekmesinde Otomatik Kayıt Yok (Satır 2897-2911)
Notes tab'ında `textarea` değiştiğinde `setTenants` çağrılıyor ama `saveCloudTenants()` çağrılmıyor. Buluta kaydetmiyor, sadece local state'i güncelliyor.

---

## 🟢 KÜÇÜk / İYİLEŞTİRME ÖNERİLERİ

### 13. "Şifre Belirleme Simülasyonu" — Gerçek Değil
Şifre belirleme formu (satır 3833) sadece `alert()` gösteriyor, gerçek şifre kaydı yapmıyor. Bu tamamen simülasyon, üstünde "simülasyon" yazıyor ama yanıltıcı.

### 14. Süper Admin Davet Linki — Sahte URL
Satır 3751: `https://app.codentra.com.tr/superadmin-invite?email=...` gerçek bir endpoint değil. Bu linke gidildiğinde 404 çıkar.

### 15. KPI — MRR Hesabı Aylık Değil
Satır 447-449: MRR (Monthly Recurring Revenue) hesabı tüm aktif kiracıların `monthlyFee`'sini topluyor. Yıllık ödemeli kiracıların `monthlyFee` değeri eğer `annualFee / 12` ile doldurulmamışsa MRR eksik hesaplanır.

### 16. Teklif Tablosu — Boş Kayıt Durumu Yok
Teklif listesinde hiç teklif olmadığında boş durum mesajı gösterilmiyor, sadece boş tablo görünüyor.

---

## ✅ Düzeltme Öncelik Sırası

| Öncelik | Sorun | İşlem |
|---|---|---|
| 🔴 Kritik | Çifte fetchCloudTenants | Yerel fonksiyonu kaldır, cloudDb'den import et |
| 🔴 Kritik | Yeni Kiracı Ekle modalı kapanıyor | onClick'i kaldır |
| 🔴 Kritik | Sabit Ağustos 2026 | Dinamik ay hesabı yap |
| 🟡 Orta | Askıya Al / Aktife Al mantığı | Sadece Aktif↔Pasif için göster |
| 🟡 Orta | paymentFilter UI yok | Filtre dropdown'u ekle |
| 🟡 Orta | Notlar kaydedilmiyor | saveCloudTenants() ekle |
| 🟡 Orta | Fatura ay filtresi eksik | Ağustos seçeneği ekle |
| 🟡 Orta | Lisans modal dışarı tıklama | onClick kaldır |
