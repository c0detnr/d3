# Doğrulama planı

## 2026-10-23 — Ana adres 404 düzeltmesi

- Neden: kökte `index.html` yoktu; `/` 404, `/map-preview.html` 200 dönüyordu.
- Ana sayfa haritaya yönlendirildi; `npm start` eklendi. Harita derlemesi ana sayfayı da içeriyor.
- `npm start -- --port 5174` çalıştı; `http://localhost:5174/`, `/map-preview.html` ve `/src/mapPreview.ts` HTTP 200 döndü.
- `npm run map:build` TypeScript kontrolüyle birlikte geçti; mevcut büyük paket uyarısı sürüyor. Bu kontrolde tarayıcı görsel incelemesi yapılmadı.

Çalışan bağımsız dünya önizlemesi mevcut. Aşağıdaki senaryoların sonuçları tarihli kayıtlarda ayrıca belirtilir; sürüş ve savaş henüz uygulanmadı.

## Kontrol katmanları

- Statik kontrol ve üretim derlemesi: proje kurulduğunda gerçek komutlarla kaydedilecek.
- Otomatik kontrol: giriş dönüşümü, açı sınırları, mermi ilerletme ve hasar hesaplaması gibi belirgin sonuçlu davranışlar.
- Tarayıcı kontrolü: yükleme, kamera, klavye/fare, odak kaybı, fizik ve varlık görünümü.
- İnsan değerlendirmesi: ağırlık, erişilebilirlik, ses/görsel tepki ve sürüş keyfi. Otomatik test bunların yerini tutmaz.

## Temel senaryolar

| Senaryo | Beklenen gözlem | Aşama |
|---|---|---|
| Sahneyi aç, yeniden boyutlandır, yeniden başlat | Doğru görüntü; çoğalan döngü/dinleyici yok | M1 |
| Kamera ile tank çevresini incele | Takip ve mesafe okunaklı; belirgin duvar/zemin kesişmesi yok | M1–M2 |
| Düz yolda hızlan, frenle, geri git | Tutarlı ve ayarlanabilir ivme; ani hız sıçraması yok | M2 |
| Yerinde ve hareket hâlinde iki yöne dön | Palet farkı ile yön değişimi; görsel palet hareketi uyumlu | M2 |
| Tepe, yan eğim, hendek ve taşlı yol | İnandırıcı tutuş ve süspansiyon; sürekli patlayan/zıplayan fizik yok | M2 |
| Aynı komutları 30/60/120 render FPS sınırlarında dene | Simülasyon sonucunda büyük kare hızı bağımlılığı yok | M2 |
| Tuş basılıyken sekmeden ayrıl, geri dön | Takılı girdi ve büyük zaman sıçraması yok | M2 |
| On dakika sür, sahneyi tekrar aç | Kontrol sorunu, sürekli büyüyen kaynak kullanımı veya kritik hata yok | M2 |
| Yakın engel arkasından ateş et | Kamera hedefi görse bile mermi ilk engelde durur | M3 |
| Yakın ve uzak hedefe ateş et | Uçuş süresi ve düşüş okunur; hızlı mermi hedefi atlamaz | M3 |
| Aynı zırha farklı açılardan ateş et | Modelin tanımlı kurallarına uygun ve açıklanabilir sonuç | M3 |
| Palet, motor ve kule modülünü hasarla | İlgili işlev etkilenir; sıfırlama başlangıç durumunu geri getirir | M3 |

## Performans hedefi — öneri

Başlangıç hedefi, belirlenecek referans masaüstü cihazda 1920×1080 çözünürlükte yaklaşık 60 FPS'tir. Bu henüz doğrulanmış destek sözü değildir. Referans cihaz ve kalite profili seçilmeden kesin minimum sistem gereksinimi yazılmaz.

Ölçümlerde cihaz/GPU, işletim sistemi, tarayıcı sürümü, render backend, çözünürlük, piksel oranı, kalite ayarı, sahne ve ölçüm süresi belirtilir. Ortalama yanında yavaş kareler ve takılmalar da incelenir. Önce ölçülür; sonra gölge, efekt, geometri ve fizik bütçeleri ayarlanır.

## Sonuç kayıt şablonu

- Tarih / kilometre taşı / sürüm veya commit:
- Cihaz, tarayıcı ve görüntü ayarları:
- Yapılan senaryo ve adımlar:
- Beklenen / gözlenen sonuç:
- Ölçüm veya ekran görüntüsü:
- Durum: geçti / başarısız / denenmedi:
- Açık sorun ve sonraki eylem:

## 2026-10-23 — Bağımsız basit harita

- `npm run map:check`: geçti.
- `npm run map:test`: geçti; NullEngine + gerçek Havok WASM. Başlangıç zemini 0 m, rampa tepesi 2 m, her iki yaklaşımın orta noktası 1 m; tümsek ve 1.2 m sınır çarpışmaları kontrol edildi. Üç kur/temizle çevriminde harita mesh ve fizik gövdesi kalmadı.
- `npm run map:build`: geçti. Büyük ana paket uyarısı var; henüz indirme/çalışma performansı ölçülmedi.
- Tarayıcı: IAB mevcut değil; Chrome bağlantısı iki denemede `Unable to load browser request-header policy` hatası verdi. Görsel kalite, kamera etkileşimi ve yeniden boyutlandırma denenmedi.
- Geçici tank sabit bir ölçek göstergesi; sürüş ve Blender varlığının entegrasyonu doğrulanmadı. FPS sonucu yok.

## 2026-10-23 — GLB dünya entegrasyonu

- `npm run tank:test`: gerçek GLB + Babylon NullEngine; 14.512 görünür üçgen, 12 tekerlek, kule/namlu hiyerarşisi, gizli COL_Hull, 4,16 × 9,235 m yatay boyut, 0 m palet tabanı, dünya +Z namlu yönü ve üç kur/temizle çevrimi geçti. Babylon materyal parçalarını ayrı mesh olarak yükler; kaynak mesh sayısıyla runtime mesh sayısı aynı değildir.
- `npm run map:test` ve `npm run map:build`: geçti. Derleme büyük paket uyarısı sürüyor; GLB 962,32 kB olarak yerel derleme varlığına dahil edildi.
- Chrome içinde gerçek model, materyaller, başlangıç/alan kamera düğmeleri ve fare tekerleğiyle yakınlaşma görüldü. [Ekran görüntüsü](../assets/tanks/iron_dust_01/previews/in_world.png). Zemin ışığı fazla parlak; görsel yön ayarı açık.
- Tank sabit görseldir; dinamik gövde, sürüş ve süspansiyon uygulanmadı. Takip kamerası, yeniden boyutlandırma, kamera kesişmesi ve performans ölçümü bu adımda doğrulanmadı. FPS iddiası yok.

## 2026-10-23 — Doğal arazi ve orman

- `npm run map:test`: geçti. Gerçek Havok ile paletlerin altındaki düz başlangıç, doğal yükseklik farkı, üçgen içi noktalarda görünür/fizik yüzey eşleşmesi, uzak arazi devamlılığı, patika ve tank çevresinin ağaçlardan açık olması, yakın ağaç gövdesine yatay isabet kontrol edildi. Aynı tohum aynı yerleşimi üretiyor; üç kur/temizle çevriminde mesh, materyal, kaplama ve fizik gövdesi kalmadı.
- `npm run tank:test`: geçti; GLB ölçeği, +Z yönü, hiyerarşi, gizli çarpışma ve kaynak temizliği korundu.
- `npm run map:build`: TypeScript dahil geçti. Önceden mevcut büyük paket uyarısı sürüyor; performans sonucu değildir.
- Chrome, 1255 × 549 CSS piksel mevcut görünüm: tank, arazi renkleri, orman silüeti, ot/kayalar, patika ve sis görüldü. Alanı göster / Başlangıca dön düğmeleri çalıştı. [Başlangıç ekranı](previews/forest-clearing.png).
- İlk arazi üçgen yönü ters bulundu; düzeltildi ve yukarı bakan normal otomatik kontrole eklendi. İlk testte üçgen örnekleme indeksi yanlış hizalıydı; üçgen başlangıcına hizalandı, son kontrol geçti.
- FPS ölçülmedi. Kamera kesişmesi, hareketli takip, yeniden boyutlandırma, sürüş ve süspansiyon bu görevde doğrulanmadı. Uzak orman yalnızca görsel; son oynanabilir alan sınırı açık.
