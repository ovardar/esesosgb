# SaaS Yönetimi Ekrani Veri Kaynaklari

Bu dokuman, SaaS Yonetimi ekraninin hangi mevcut ekranlardan ve hangi veri baglamlarindan beslenecegini listeler.

Amac, ileride tasarim ve veri modeli kararlarini hizlandirmaktir.

## Temel Ilke

SaaS Yonetimi ekrani OSGB operasyon verisini yonetmek icin degil, Eses Yazilim ile OSGB musterisi arasindaki iliskiyi yonetmek icin vardir.

Bu nedenle veri kaynaklari ikiye ayrilir:

1. Dogrudan tasinacak veya yeniden kullanilacak veriler
2. Buraya tasinmamasi gereken, sadece referans olarak bakilacak veriler

## Veri Kaynagi Esleme Tablosu

| Hedef bolum | Muhtemel mevcut kaynak | Tasinacak veri | Not |
|---|---|---|---|
| Ust ozet KPI'lar | saas-admin.html | aktif musteri sayisi, tenant sayisi, durum bilgileri | dogrudan Eses baglami |
| Hizli aksiyonlar | saas-admin.html | tenant acma, musteri ekleme aksiyonlari | gelistirilerek kullanilir |
| Satis hunisi | yeni Eses CRM akisi | lead asamasi, sonraki aksiyon, gorusme tarihi | mevcut OSGB CRM'den ayri olmalı |
| Aktif musteri tablosu | saas-admin.html | musteri listesi, paket, tenant durumu | ana kaynak |
| SaaS sozlesme ozet | yeni olusacak Eses sozlesme kayitlari | sozlesme no, baslangic, bitis, paket, lisans | OSGB hizmet sozlesmesinden farkli |
| Finans paneli | yeni olusacak fatura/tahsilat kayitlari | son fatura, borc, tahsilat, gecikme | Eses-OSGB ticari iliskisi |
| Destek paneli | yeni destek kaydi yapisi | acik issue, kritik durum, son destek talebi | tenant destek akisina bagli |
| Kullanim ozeti | tenant aktivite verileri | son login, aktif kullanici, kullanim sinyali | operasyonel degil, analitik ozet |

## Mevcut Ekranlardan Tasinabilecek Veriler

### 1. saas-admin.html

Bu ekran en dogrudan veri kaynagidir.

Buradan alinabilecek alanlar:

1. Tenant / musteri listesi
2. Musteri temel kimlik bilgisi
3. Paket bilgisi
4. Kullanici limitleri
5. Tenant aktif/pasif durumu
6. Yonetici kullanici bilgisi
7. Musteri olusturma akislari

SaaS Yonetimi'nin cekirdegi buyuk olcude bu ekrandan tureyecektir.

### 2. crm.html ve bagli CRM ekranlari

Bu moduller mevcut durumda OSGB CRM baglamina daha yakindir. Dogrudan kopyalanmamali, sadece mantik olarak referans alinmalidir.

Buradan alinabilecek fikirler:

1. Pipeline asamalari mantigi
2. Aktivite kaydi yapisi
3. Teklif / sozlesme gecis mantigi
4. Gorev ve takip sistemi mantigi

Buradan dogrudan tasinmamasi gerekenler:

1. Firma = OSGB musterisi varsayimi
2. OSGB'nin son musterisine ait sozlesme alanlari
3. OSGB personel atama mantigi

Yani mevcut CRM yapisi kopyalanmaz, sadece Eses CRM icin referans olur.

### 3. crm-detail.html

Bu sayfadaki bazi desenler tekrar kullanilabilir:

1. Asama guncelleme mantigi
2. Not ve aktivite yapisi
3. Bagli teklif / sozlesme akisi
4. Tek ekranda iliski yonetimi fikri

Ancak buradaki veriler SaaS Yonetimi'ne dogrudan tasinmamali cunku bunlar OSGB'nin kendi musterisi icindir.

### 4. dashboard.html

Bu ekranin verileri Eses tarafi icin dogrudan uygun degildir.

Faydali olabilecek tarafi:

1. KPI kart mantigi
2. Ozet gostergelerin sayfa acilisinda toplanmasi
3. Hangi metriklerin gorunur yerlestirilecegine dair UI deseni

Tasinmamasi gerekenler:

1. Personel operasyonu metrikleri
2. Egitim, saglik, risk, gorev gibi OSGB odakli KPI'lar

### 5. staff.html

Dogrudan veri kaynagi degildir.

Ancak SaaS Yonetimi icin su sinyaller ileride referans olabilir:

1. Toplam kullanici sayisi
2. Lisans limiti doluluk orani
3. Son eklenen kullanicilar

Bu veriler operasyon icin degil, paket kullanim analizi icin kullanilir.

### 6. login.html ve auth akislari

SaaS Yonetimi icin dolayli veri kaynagidir.

Buradan cikabilecek sinyaller:

1. Son login tarihi
2. Aktivasyon durumu
3. Davet kabul durumu
4. Yonetici hesabinin hazir olup olmadigi

Bu veriler musteri sagligi panelinde kullanilabilir.

## Buraya Tasinmamasi Gereken Veriler

SaaS Yonetimi ekranina su operasyon verileri ana veri olarak alinmamali:

1. Egitim planlari
2. Risk analiz detaylari
3. Periyodik muayene kayitlari
4. Is kazasi / ramak kala detaylari
5. KKD dagitim detaylari
6. Hizmet verilen firma calisan listeleri
7. OSGB'nin kendi teklif operasyonu

Bunlar ancak ikincil sinyal olarak ozetlenebilir. Ornek:

1. Son 30 gunde hic veri girisi yok
2. Tenant uzun suredir pasif
3. Kullanim dusuyor

## Hedef Bolum Bazli Veri Ihtiyaci

### A. Ust Ozet KPI'lar

Gereken veri:

1. Toplam aktif tenant
2. Deneme surecindeki tenant
3. Askida tenant
4. Bu ay yeni aktif olan tenant
5. Gecikmede olan odeme sayisi
6. Yaklasan yenileme sayisi

Kaynak:

1. saas-admin baglami
2. yeni abonelik/finans yapisi

### B. Satis Hunisi

Gereken veri:

1. OSGB aday adi
2. Yetkili kisi
3. Iletisim kanali
4. Lead asamasi
5. Son gorusme tarihi
6. Sonraki aksiyon tarihi
7. Potansiyel paket
8. Ic not

Kaynak:

1. yeni Eses CRM veri modeli
2. mevcut CRM ekranlarindaki akis mantigi referans olabilir

### C. Aktif Musteri Tablosu

Gereken veri:

1. OSGB adi
2. Tenant ID
3. Paket
4. Kullanici limiti
5. Aktif kullanici sayisi
6. Tenant durumu
7. Baslangic / bitis tarihi
8. Son login tarihi
9. Son fatura tarihi
10. Borc durumu
11. Destek durumu

Kaynak:

1. saas-admin verileri
2. auth / staff / tenant ozet sinyalleri
3. yeni finans ve destek kayitlari

### D. Sag Bilgi Paneli

Gereken veri:

1. SaaS sozlesme ozet
2. Son tahsilat ve bekleyen odeme
3. Son destek kaydi
4. Kullanim saglik skoru

Kaynak:

1. yeni sozlesme tablosu
2. yeni finans tablosu
3. yeni destek kayitlari
4. login ve kullanim ozetleri

### E. Musteri Detay Drawer

Gereken veri:

1. Genel musteri profili
2. Gorusme ve aktivite gecmisi
3. SaaS sozlesme versiyonlari
4. Fatura / tahsilat gecmisi
5. Destek kayitlari
6. Tenant teknik durumu
7. Ic ekip notlari

Kaynak:

1. saas-admin temel verileri
2. yeni Eses CRM
3. yeni sozlesme / finans / destek veri yapilari

## Teknik Ayrim Notu

Su ayrim korunmali:

1. `Eses -> OSGB` iliskisi ayri veri katmani
2. `OSGB -> hizmet verilen firma` iliskisi ayri veri katmani

Boylece SaaS Yonetimi ekraninda operasyonel musteri kayitlari ile ticari tenant kayitlari birbirine karismaz.

## Uygulama Sirasi

Bu verileri toplarken asagidaki sirayla gitmek daha dogru olur:

1. saas-admin kaynaklarini merkeze almak
2. yeni Eses CRM veri modelini ayirmak
3. sozlesme ve finans kayitlarini Eses baglaminda tanimlamak
4. destek ve tenant saglik sinyallerini eklemek
5. ancak en sonda OSGB tarafindan gelen kullanim ozetlerini baglamak

## Sonuc

SaaS Yonetimi ekraninin veri omurgasi mevcut OSGB operasyon ekranlarindan degil, agirlikli olarak su alanlardan gelmelidir:

1. saas-admin baglami
2. yeni Eses CRM yapisi
3. yeni SaaS sozlesme kayitlari
4. yeni finans / tahsilat kayitlari
5. destek ve tenant aktivite sinyalleri

OSGB operasyon modulleri ise bu ekran icin ana veri kaynagi degil, sadece ikincil saglik sinyali kaynagidir.