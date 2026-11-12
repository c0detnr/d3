# Nişancı ekranı

Sağ fare basılıyken özgün optik katman açılır. Kırık beyaz ince retikül, 10 mil aralıklı gerçek açısal ölçek, hafif kenar karartması ve köşe veri blokları ortak `hudTokens.css` / Barlow ailesini kullanır. Mevcut `#aim-bore` namlu halkası korunur; merkez retikülü kamera niyetidir, halka gerçek namlu doğrultusudur. AZ gerçek namlunun dünya azimutudur (000–359).

- **T**: yalnız sağ fare nişancı görüşünde DAY → WHT → BHT → DAY. Görüşten çıkınca DAY'e döner. T/L atamaları giriş, stüdyo ve FPV dosyalarında kontrol edildi; mevcut atamalarla çakışma bulunmadı.
- **Tekerlek**: mevcut kamera FOV/zoom davranışı korunur. Gösterilen büyütme `tan(0.8 / 2) / tan(FOV / 2)`; üçüncü şahıs 0.8 rad FOV'u 1× referanstır.
- **L**: tank topunun namlu ağzından, namlu doğrultusunda en fazla 5000 m fizik raycast'i. Oyuncunun kendi fizik gövdesi dışlanır. İlk fizik yüzeyinin mesafesi yuvarlanır; isabet yoksa `RNG ---`. Sonuç dört gerçek saniye tutulur; normal görüşte merkez altında küçük metin, nişancı görüşünde sol alt veri bloğudur. Balistik, taret yönü veya atış çözümü değiştirilmez.
- APFSDS etiketi mevcut HUD mühimmat adını sürdürür; dolum/hazır bilgisi doğrudan `WeaponSystem.reloadRemaining` üzerinden gelir. FCS satırı manuel nişanı ve yakın namlu engelini açıkça belirtir; otomatik balistik çözüm iddiası yoktur.

Termal, yalnız WHT/BHT etkin olduğunda oluşturulan yarı çözünürlüklü, derinlik tamponlu bir maske ve tek Babylon `PostProcess` kullanır. Tanklar (oyuncu, düello rakibi, dost/düşman AI ve görev keşif tankları), piyadeler tek `ThermalView.register(meshes)` API'sinden kaydedilir. Sahnenin diğer mesh'leri soğuk maskeye çizilir ve hedefleri örter. Maske malzemeleri render-pass override'ıdır; asıl PBR malzemeleri ve rendering group'ları değiştirilmez. DAY, görüşten çıkış, duraklama, kamera değişimi ve sahne kapanışında postprocess, hedef doku ve iki geçici malzeme serbest bırakılır. BHT/WHT geçişi aynı kaynakları kullanır.

Sınırlar: termal fiziksel sıcaklık simülasyonu değildir; sıcak aktörlerin bütün görünür geometrisi sıcak sınıfındadır. Maske bir ek geometri geçişidir, MSAA/mipmap/partikül/sprite geçişi yoktur. Alfa kesikli dekorlar maskede katı geometri olarak kapanabilir; sprite dumanı ayrıca sıcaklık simülasyonu/örtücüsü değildir. Performans ölçümü yapılmadı. İmha edilen araç sıcak sınıfını korur. UI metinleri TR/EN sözlüklerindedir.

## Doğrulama

`node --experimental-strip-types scripts/check-gunner-sight.ts`: mod döngüsü, optik büyütme, azimut sarımı, LRF aralık/yuvarlama/4 s sonlanma, klavye/fokus kapıları ve üç WHT/BHT/DAY kaynak temizliği çevrimi kontrol edilir. Son otomatik ve tarayıcı kontrol sonuçları aşağıda kaydedilir; insan sürüş/görsel kabulü ve FPS ölçümü bu çalışma kapsamında değildir.

2026-11-13 otomatik sonuçları: `npm run map:build`, `npm run combat:test`, `npm run mission:test`, `node --experimental-strip-types scripts/check-gunner-sight.ts` ve `git diff --check` geçti. Vite mevcut büyük JS paketi uyarısını veriyor.

Tarayıcı kontrolü yapıldı: headless Chromium, ANGLE SwiftShader, 1440×960 pencere / 1440×817 içerik alanı, test sahası `?duel=1`. Gerçek fare/klavye olaylarıyla normal LRF metni, sağ tuş optik katmanı, DAY/WHT/BHT/DAY döngüsü ve sağ tuş bırakıldığında gizlenme kontrol edildi; sıfır sayfa hatası. DAY/WHT/BHT ekran görüntüleri `/tmp/gunner-{day,wht,bht}.png` olarak alındı ve incelendi (geçici dosyalar). Kendi tankı WHT'de beyaz, BHT'de siyah; arazi karşıt soğuk gri tonlarında görüldü. Bu bir cihaz FPS ölçümü veya insan görsel/sürüş kabulü değildir; dar ekran ve hareketli uzak hedef kabulü açık.

Son görünüm aynı Chromium kontrolüyle derlenmiş `dist-map` üzerinde de geçti; geliştirme sunucusundaki eşzamanlı HMR yenilemelerinden bağımsız olarak doğrulandı. BHT veri bloklarına ortak koyu panel zemini, retiküle ince koyu gölge eklendi; yardım satırı minimapten uzak merkez altına taşındı.
