# Top atışı geri bildirimi

2026-10-24 — Kullanıcı mevcut geri tepme, ses ve dumandan memnun olmadığını belirtti; yeniden tasarımı ve küçük kamera sarsıntısını onayladı. Uygulama hazır; insan dinlemesi ve son atış hissi kabulü açık.

## Mekanik hareket

Namlu 0,42 m geri gider: 65 ms hızlı, frenlenen geri hareket; ardından 720 ms kontrollü dönüş. Konum sıçraması ve salınan yay yerine zamana bağlı, ileri taşmayan profil kullanılır. Fizik adımı 60 Hz; görsel konum önceki/güncel adım arasında interpolate edilir. Atış gerçek namlu pozundan çıkar. 5 s dolum, tek basış ve mevcut deneme balistiği korunur.

Gövdeye taret yüksekliğinden atışın ters yönünde 16000 N·s darbe uygulanır. Böylece ileri/yan atışta farklı pitch/roll tepkisi mevcut süspansiyon üzerinden oluşur. 42 tonluk gövdede doğrusal hız değişimi yaklaşık 0,38 m/s; tankı fırlatan bir darbe değildir. Bunlar kurgusal oyun ayarlarıdır, gerçek tankın ölçülmüş özellikleri değildir.

Kamera hareketi yalnız sunumdadır: küçük pitch/yaw/roll, hızlı başlangıç ve 0,5 s içinde sıfırlanma. Kamera konumu ve nişan niyeti değiştirilmez. Sıfırlama darbeyi temizler. Ayarlar `src/game/camera/ShotCameraMotion.ts`, namlu ve gövde ayarları `WeaponDefinition.ts` içindedir.

## Namlu, gaz ve toz

- 35–60 ms kısa parlama; tek, kısa ömürlü namlu ışığı.
- Parlama ve gaz için ayrı CC0 Brackeys dokuları ve blend yöntemleri: `muzzle_02_a.png` ile `smoke_07_a.png`. Gaz dokusunun kenarı ve iç yoğunluğu düzensizdir.
- Gaz gerçek namlu doğrultusunda konik yayılır; hızlı çıkış, sürüklenmeyle yavaşlama, genişleme, hafif yükselme ve sönme. Her atışta parçacık dağılımı değişir.
- Namlu altına 4,5 m fizik sorgusu; yalnız `natural-terrain` isabetinde basınç tozu. Zeminden uzaklaştıkça yoğunluk azalır; havada veya başka yüzeyin üzerinde yapay toz üretilmez. Zemin tozu daha sıcak renkte ve yatay yayılımlıdır. Bunun dışında palet tozu değiştirilmedi.
- Dünya uzayında toplam 128 aktif parçacık yuvası; namlu/gaz/toz/kıvılcım/alev/imha için altı ayrı yönetici, her birinde 128 önceden ayrılmış sprite; bir parçacık yalnız kendi türünde görünür. Kaynaklar sahne kapanışında bırakılır. Ömrü biten sprite ara karede yeniden görünmez.

## Ses

Eski kısa gürültü + sinüs top sesi yerine üç varyasyonlu stereo rapor kullanılır. Her varyasyon başlangıçta üretilir: keskin kısa patlama, düşük frekanslı basınç gövdesi, daha sessiz mekanik katman ve yaygın stereo sönüm. Dış ses kaydı eklenmedi. Kaynak `src/game/audio/cannonBlast.ts`.

Mevcut AudioSystem ses düzeyi, limiter, sekme askıya alma ve temizlik akışı korunur. Bir top atışı tek sınırlı ses kaynağı kullanır; atış anında yeni buffer üretilmez. Dolum sonu kısa gürültü katmanları kullanır. Yankı kuyruğu sabit bir tasarım katmanıdır; harita geometrisinden hesaplanan akustik simülasyon değildir.

## Doğrulama ve açık konular

- Otomatik: gerçek GLB namlu pozu/dolum; hızlı geri hareket, sekmesiz dönüş, sıfırlama ve 30/60/120 FPS eşitliği; gerçek Havok ile yönlü gövde darbesi; küçük kamera açıları ve sönme; zemin tozu kapısı, kısa parlama/uzun gaz, parçacık sınırı ve sprite/doku/ışık temizliği.
- Ses: 44,1/48 kHz stereo farkı, azalan enerji, sınırlı tepe, DC ve kuyruk sonu; ses havuzu ve temizlik. Bunlar insan dinlemesinin yerine geçmez.
- Tarayıcı: yakın ve normal görünümde atış, dolum, kısa parlama ve dağılan gaz incelendi. [Yakın atış görüntüsü](previews/cannon-shot-feedback.png).
- Kontroller: `npm run combat:test`, `npm run audio:test`, `npm run map:build`, `node --experimental-strip-types scripts/check-camera-turret-zoom.ts`; sürüş ve toz için `npm run drive:test`, `npm run effects:test`, `npm test`.
- İnsan dinlemesi, kullanıcının atış hissi kabulü ve donanım üzerinde performans ölçümü açık. Yazılım render incelemesinden FPS iddiası çıkarılmaz. M1/M2/M3 son kabulü tamamlandı sayılmaz.
