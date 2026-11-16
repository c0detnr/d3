# Top atışı geri bildirimi

2026-10-24 — Kullanıcı mevcut geri tepme, ses ve dumandan memnun olmadığını belirtti; yeniden tasarımı ve küçük kamera sarsıntısını onayladı. 2026-11-16 — Top sesi, iki tank profili, mesafe, namlu ve isabet efektleri yenilendi. İnsan dinlemesi ve son atış hissi kabulü açık.

## Mekanik hareket

Namlu 0,42 m geri gider: 65 ms hızlı, frenlenen geri hareket; ardından 720 ms kontrollü dönüş. Konum sıçraması ve salınan yay yerine zamana bağlı, ileri taşmayan profil kullanılır. Fizik adımı 60 Hz; görsel konum önceki/güncel adım arasında interpolate edilir. Atış gerçek namlu pozundan çıkar. 5 s dolum, tek basış ve mevcut deneme balistiği korunur.

Gövdeye taret yüksekliğinden atışın ters yönünde 16000 N·s darbe uygulanır. Böylece ileri/yan atışta farklı pitch/roll tepkisi mevcut süspansiyon üzerinden oluşur. 42 tonluk gövdede doğrusal hız değişimi yaklaşık 0,38 m/s; tankı fırlatan bir darbe değildir. Bunlar kurgusal oyun ayarlarıdır, gerçek tankın ölçülmüş özellikleri değildir.

Kamera hareketi yalnız sunumdadır: küçük pitch/yaw/roll, hızlı başlangıç ve 0,5 s içinde sıfırlanma. Kamera konumu ve nişan niyeti değiştirilmez. Sıfırlama darbeyi temizler. Ayarlar `src/game/camera/ShotCameraMotion.ts`, namlu ve gövde ayarları `WeaponDefinition.ts` içindedir.

## Namlu, gaz ve toz

2026-11-16 — Kullanıcı top sesinin "tak" diye, tüfek gibi çıktığını belirtti; ateş ve isabet geri bildirimi güçlendirildi.

- Namlu ucu: 45–75 ms ömürlü, namlu boyunca incelen dört parçalı ana alev; iki yanda namlu freni çıkışı (kısa alev + yan gaz). Tek ışık 0,09 s, daha güçlü ve geniş menzilli.
- Öne püsküren hızlı gaz (14–36 m/s), ardından 2,6–4 s yaşayan, yavaşça genişleyip yükselen ve rüzgârla sürüklenen duman bulutu.
- Namlu altındaki `natural-terrain` için toz halkası (atış yönünde daha güçlü) ve kesekler. Bot atışları da aynı zemin sorgusunu kullanır; tank gövdesi veya bina üzerinde toz üretilmez.
- İsabet: toprak = toz sütunu + yayılan etek + kesekler; beton = gri toz + gri döküntü; metal yapı = parlama, kıvılcım, az toz. Zırh delme = parlama, ışık, parlak kıvılcım patlaması, yavaş sıcak parçalar, koyu duman. Sekme/delmeme = merminin yansıma yönünde kıvılcım izi (yön yoksa tek teğet yön), küçük parlama. Tank imhası = iki patlama sprite'ı, yükselen alevler, koyu döküntü, siyah duman sütunu, uzun ışık.
- Parçacık havuzu 160 yuvaya çıkarıldı (önceki 128); sabit adım, interpolasyon, tür başına ön ayrılmış sprite ve dispose akışı aynı. Kamera sarsıntısı ve geri tepme değiştirilmedi.

## Ses

Top sesi `src/game/audio/cannonBlast.ts` içinde, profil `AudioDefinition.ts` → `CANNON_AUDIO['01' | '02']` üzerinden üretilir: çok kısa çatlama, 40–90 Hz düşen sinüs basınç vuruşu (küçük hoparlörler için hafif doyum harmonikleri), gürültü tabanlı patlama gövdesi, gürleme ve kanal başına farklı zamanlı arazi yansımaları, sessiz kama/geri tepme katmanı. Her profil için iki varyasyon başlangıçta bir kez üretilir.

- `01` (zeytin): daha keskin ve biraz tiz, daha kısa kuyruk. `02` (kum, ağır): daha derin, ağır ve uzun gürlemeli.
- Oyuncu kendi tankının profilini, botlar diğer tankın profilini çalar (düello, 3v3/5v5, LAN; görev keşif tankları `02`).
- Mesafe (`combatDistanceCue`): 20 m içinde tam bant; uzakta alçak geçiren filtre (700 Hz'e kadar), 1/(1+d/60) zayıflama ve ses hızı gecikmesi (en çok 0,6 s). Pan davranışı korunur.
- Eşzamanlı en çok 4 top sesi; aşılırsa en eskisi 12 ms zaman sabitiyle sönerek bırakılır. Toplam savaş sesi sınırı 12.
- İsabet sesleri (`impactSound.ts`) aynı yöntemle önceden üretilir: toprak (ağır tok vuruş + dökülen toprak), beton (sert çatlama + ufalanma), metal (çınlama), sekme (keskin ping + uzaklaşan vızıltı), delme (derin zırh çınlaması + iç çatırtı), imha (uzun derin patlama + ikincil patlamalar).

Ölçüm (48 kHz, sol kanal, başsız çözümleme; eski → `01` / `02`):

| Ölçüt | Eski | 01 | 02 |
|---|---|---|---|
| Süre | 1,65 s | 1,70 s | 2,30 s |
| Tepe | 0,878 | 0,890 | 0,890 |
| RMS 0–100 ms | −9,4 dB | −7,1 dB | −5,5 dB |
| RMS 0,5–1 s | −34,0 dB | −28,1 dB | −21,6 dB |
| −40 dB'e iniş | 1,01 s | 1,10 s | 1,90 s |
| Enerji < 90 Hz | %13 | %62 | %73 |
| Enerji 250 Hz–2 kHz / > 2 kHz | %46 / %21 | %15 / %1,5 | %10 / %0,5 |
| 120 Hz alçak geçiren pay (ilk 0,6 s) | 0,12 | 0,43 | 0,54 |

Eski ses enerjisinin üçte ikisi 250 Hz üstündeydi; "tak" karakterinin sayısal karşılığı budur. Yankı kuyruğu sabit bir tasarım katmanıdır, harita akustiği değildir. Kaynak/lisans: bu proje için kodla üretildi; dış ses dosyası yok.

## Doğrulama ve açık konular

- Otomatik: gerçek GLB namlu pozu/dolum; hızlı geri hareket, sekmesiz dönüş, sıfırlama ve 30/60/120 FPS eşitliği; gerçek Havok ile yönlü gövde darbesi; küçük kamera açıları ve sönme; zemin tozu kapısı, kısa parlama/uzun gaz, parçacık sınırı ve sprite/doku/ışık temizliği.
- Ses: 44,1/48 kHz'de iki profil için stereo farkı, alçak frekans payı ≥ 0,4 (eski ses 0,12 ile geçemez), 0,5 s sonrası kuyruk, `02` kuyruğunun `01`'den uzun olması, sınırlı tepe, DC ve kuyruk sonu; isabet tamponları; mesafe filtresi/gecikme/zayıflama; 4 top sesi ve 12 toplam ses sınırı. Bunlar insan dinlemesinin yerine geçmez.
- Tarayıcı: yakın ve normal görünümde atış, dolum, kısa parlama ve dağılan gaz incelendi. [Yakın atış görüntüsü](previews/cannon-shot-feedback.png).
- Kontroller: `npm run combat:test`, `npm run audio:test`, `npm run map:build`, `node --experimental-strip-types scripts/check-camera-turret-zoom.ts`; sürüş ve toz için `npm run drive:test`, `npm run effects:test`, `npm test`.
- İnsan dinlemesi, kullanıcının atış hissi kabulü ve donanım üzerinde performans ölçümü açık. Yazılım render incelemesinden FPS iddiası çıkarılmaz. M1/M2/M3 son kabulü tamamlandı sayılmaz.
